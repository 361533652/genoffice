/**
 * The xlsx sidecar as WebAssembly.
 *
 * The desktop app spawns the Rust sidecar as a child process and talks
 * JSON-lines over stdin/stdout (apps/sheets/src/main/xlsx-sidecar-client.ts).
 * This client runs the SAME engine — compiled to wasm32-wasip1 with the
 * `single-thread` path the crate already supports — inside the host, and
 * drives it through the `sidecar_handle_line` export (src/wasm.rs). The
 * protocol, the session semantics and the 26-field open result are identical;
 * only the transport changed.
 *
 * The WASI filesystem is an in-memory tree (@bjorn3/browser_wasi_shim). The
 * gateway's FileSystemPort is configured against the SAME tree (shim-fs.ts),
 * so a path the sidecar extracts to is a path the gateway can read back.
 *
 * Calls are synchronous under the hood: a large open or recalc blocks the JS
 * thread until it answers. Moving the engine into a Web Worker is the next
 * step; the client surface is already async so that change stays local.
 */
import {
  WASI,
  File,
  OpenFile,
  PreopenDirectory,
  ConsoleStdout,
  Directory,
} from '@bjorn3/browser_wasi_shim'

/** The virtual filesystem roots, shared with the gateway's FS adapter. */
export interface SidecarTree {
  /** scratch space: snapshots, extraction dirs, save targets (TMPDIR) */
  tmp: Directory
  /** documents handed to the engine by the host */
  data: Directory
}

export interface WasmSidecarOptions {
  /** the compiled xlsx_sidecar.wasm bytes, or a URL to fetch them from */
  wasm: Uint8Array | string
  /** engine diagnostics (stdout/stderr lines), for error reports */
  onDiagnostic?: (line: string) => void
}

interface SidecarResponse {
  version: number
  requestId: string
  ok: boolean
  result?: unknown
  error?: { code: string; message: string }
}

const PROTOCOL_VERSION = 1
const MAX_DIAGNOSTICS = 64

export class WasmSidecarClient {
  private readonly diagnostics: string[] = []
  private requestCounter = 0

  private constructor(
    private readonly instance: WebAssembly.Instance,
    readonly tree: SidecarTree,
  ) {}

  static async create(options: WasmSidecarOptions): Promise<WasmSidecarClient> {
    const bytes =
      typeof options.wasm === 'string'
        ? new Uint8Array(await (await fetch(options.wasm)).arrayBuffer())
        : options.wasm
    const diagnostics: string[] = []
    const note = (line: string): void => {
      diagnostics.push(line)
      if (diagnostics.length > MAX_DIAGNOSTICS) diagnostics.shift()
      options.onDiagnostic?.(line)
    }
    const tmp = new Directory(new Map())
    const data = new Directory(new Map())
    const wasi = new WASI(
      ['xlsx-sidecar'],
      ['TMPDIR=/tmp'],
      [
        new OpenFile(new File(new Uint8Array(0))),
        ConsoleStdout.lineBuffered(note),
        ConsoleStdout.lineBuffered(note),
        new PreopenDirectory('/tmp', tmp.contents),
        new PreopenDirectory('/data', data.contents),
      ],
      { debug: false },
    )
    // copy into a plain ArrayBuffer-backed view: compile() rejects
    // SharedArrayBuffer-backed views, and the type system cannot tell them apart
    const module = await WebAssembly.compile(new Uint8Array(bytes))
    const instance = await WebAssembly.instantiate(module, {
      wasi_snapshot_preview1: wasi.wasiImport,
    })
    // reactor init: the cdylib has no _start, only the sidecar_* exports
    wasi.initialize(instance as unknown as { exports: { memory: WebAssembly.Memory; _initialize?: () => unknown } })
    const client = new WasmSidecarClient(instance, { tmp, data })
    client.diagnostics.push(...diagnostics)
    return client
  }

  private exports(): Record<string, unknown> {
    return this.instance.exports as Record<string, unknown>
  }

  /** One protocol request. Synchronous wasm call wrapped in the async surface. */
  async request<T = unknown>(command: Record<string, unknown>): Promise<T> {
    const ex = this.exports()
    const alloc = ex.sidecar_alloc as (len: number) => number
    const dealloc = ex.sidecar_dealloc as (ptr: number, len: number) => void
    const handle = ex.sidecar_handle_line as (ptr: number, len: number) => number
    const free = ex.sidecar_free_response as (ptr: number) => void
    const memory = ex.memory as WebAssembly.Memory
    if (!alloc || !handle || !free || !memory) {
      throw new Error('xlsx sidecar wasm exports are missing — rebuild with the wasm target.')
    }
    const requestId = `wasm-${++this.requestCounter}-${Date.now().toString(36)}`
    const payload = new TextEncoder().encode(
      JSON.stringify({ version: PROTOCOL_VERSION, requestId, ...command }),
    )
    const ptr = alloc(payload.length)
    new Uint8Array(memory.buffer, ptr, payload.length).set(payload)
    let respPtr = 0
    try {
      respPtr = handle(ptr, payload.length)
    } finally {
      dealloc(ptr, payload.length)
    }
    if (!respPtr) {
      throw new Error(`xlsx sidecar returned no response for ${String(command.command)}.`)
    }
    // re-read the buffer: the call may have grown (and detached) the memory
    const len = new DataView(memory.buffer).getUint32(respPtr, true)
    const text = new TextDecoder().decode(new Uint8Array(memory.buffer, respPtr + 4, len))
    free(respPtr)
    let response: SidecarResponse
    try {
      response = JSON.parse(text) as SidecarResponse
    } catch {
      throw new Error(`xlsx sidecar sent a garbled response: ${text.slice(0, 200)}`)
    }
    if (response.ok) return response.result as T
    const detail = response.error
      ? `${response.error.code}: ${response.error.message}`
      : 'unknown sidecar failure'
    const tail = this.diagnostics.slice(-8).join('\n')
    throw new Error(`xlsx sidecar ${String(command.command)} failed — ${detail}${tail ? `\n${tail}` : ''}`)
  }

  // ---- the XlsxSidecarClient surface (same commands, same shapes) ---------

  open(path: string, locale = 'zh', shortDateFormat?: string): Promise<unknown> {
    return this.request({
      command: 'open',
      path,
      locale,
      ...(shortDateFormat === undefined ? {} : { shortDateFormat }),
    })
  }

  readRange(input: {
    sessionId: string
    sheetId: string
    range: { startRow: number; endRow: number; startColumn: number; endColumn: number }
  }): Promise<unknown> {
    return this.request({ command: 'read_range', ...input })
  }

  readFormulaCells(input: { sessionId: string; sheetId: string }): Promise<unknown> {
    return this.request({ command: 'read_formula_cells', ...input })
  }

  findCells(input: Record<string, unknown> & { sessionId: string }): Promise<unknown> {
    return this.request({ command: 'find_cells', ...input })
  }

  readRowOutline(input: { sessionId: string; sheetId: string }): Promise<unknown> {
    return this.request({ command: 'read_row_outline', ...input })
  }

  close(sessionId: string): Promise<void> {
    return this.request({ command: 'close', sessionId })
  }

  readMedia(input: { sessionId: string; visualId: string }): Promise<unknown> {
    return this.request({ command: 'read_media', ...input })
  }

  convertWorkbook(input: { path: string; targetPath: string }): Promise<unknown> {
    return this.request({ command: 'convert_workbook', ...input })
  }

  archiveManifest(path: string): Promise<unknown> {
    return this.request({ command: 'archive_manifest', path })
  }

  readEntries(input: {
    path: string
    entries: readonly string[]
    outputDir: string
  }): Promise<unknown> {
    return this.request({ command: 'read_entries', ...input })
  }

  scanEntries(input: {
    path: string
    entries: readonly string[]
    needle: string
  }): Promise<unknown> {
    return this.request({ command: 'scan_entries', ...input })
  }

  saveArchive(input: {
    sourcePath: string
    targetPath: string
    replacements: readonly { name: string; contentPath: string }[]
    removals: readonly string[]
    additions: readonly { name: string; contentPath: string }[]
  }): Promise<unknown> {
    return this.request({ command: 'save_archive', ...input })
  }

  recalcCells(input: {
    path: string
    edits: readonly { sheet: string; row: number; column: number; input: string }[]
    reads: readonly {
      sheet: string
      range: { startRow: number; endRow: number; startColumn: number; endColumn: number }
    }[]
    reportStale?: boolean
  }): Promise<unknown> {
    return this.request({ command: 'recalc_cells', ...input })
  }

  updateExternalLinks(input: { path: string }): Promise<unknown> {
    return this.request({ command: 'update_external_links', ...input })
  }

  readExternalLinks(input: { path: string }): Promise<unknown> {
    return this.request({ command: 'read_external_links', ...input })
  }

  readExternalLinkUsage(input: { path: string }): Promise<unknown> {
    return this.request({ command: 'read_external_link_usage', ...input })
  }

  listExternalLinks(input: { path: string }): Promise<unknown> {
    return this.request({ command: 'list_external_links', ...input })
  }

  /** The wasm engine does not spawn or die; crash recovery hooks stay inert. */
  onProcessExit(_listener: () => void): () => void {
    return () => {}
  }

  start(): void {}

  getProcessId(): number | null {
    return null
  }

  stop(): void {
    const reset = this.exports().sidecar_reset as (() => void) | undefined
    reset?.()
  }
}
