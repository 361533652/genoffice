import type { DocumentKind, FileHandle, OpenResult } from '@genoffice/host-contract'
import { sha256Hex } from './node-globals.js'

/**
 * Browser file access through the File System Access API.
 *
 * This is the browser host's `FileHost`. It mirrors what Android SAF will do
 * later: the renderer gets an opaque handle plus bytes, never a path. Where the
 * API is missing (Safari, older WebViews) every entry point reports
 * `unsupported` instead of throwing, so the UI can hide the affordance.
 */

const EXT_BY_KIND: Record<DocumentKind, string> = {
  docx: '.docx',
  xlsx: '.xlsx',
  pptx: '.pptx',
  pdf: '.pdf',
  markdown: '.md',
  html: '.html',
}

interface FsWindow {
  showOpenFilePicker?: (options?: unknown) => Promise<FileSystemFileHandle[]>
  showSaveFilePicker?: (options?: unknown) => Promise<FileSystemFileHandle>
}

/** A handle plus the live FileSystemFileHandle behind it, when we have one. */
interface BrowserFileHandle extends FileHandle {
  readonly native?: unknown
}

let counter = 0
const liveHandles = new Map<string, FileSystemFileHandle>()

/**
 * Files a host handed over without a FileSystemFileHandle.
 *
 * A picker-backed host has a real handle; a host that received bytes from
 * elsewhere (a test, a drag-drop, and later an Android SAF descriptor) only has
 * the data. Both must answer {@link readFromHandle}, or a caller cannot tell
 * which kind of host it is on.
 */
const rawFiles = new Map<string, File>()

/** Register a plain File under a handle id. */
export function registerRawFile(id: string, file: File): void {
  rawFiles.set(id, file)
}

/** The plain File behind a handle, when the host kept one. */
export function rawFileFor(id: string): File | null {
  return rawFiles.get(id) ?? null
}

/**
 * Register a File and return the handle id callers should store.
 *
 * The id is shaped like `host/granted-3/filename.docx`, not a bare token. A
 * renderer with no path still derives its displayed filename by splitting on a
 * separator (`filePath.split(/[\\/]/).pop()`), and several of them do that
 * before any handle-aware code runs. A bare id like `granted-3` came out in the
 * title bar and status line as the literal string "granted-3"; the trailing
 * segment makes those call sites keep working without teaching every one of them
 * about handles.
 *
 * The id stays opaque: nothing may parse it beyond that last segment, and a
 * real Android host will put a SAF document name there for the same reason.
 */
export function grantFile(file: File, id?: string): string {
  // the id carries the display name in its last segment: callers split it, and a
  // bare token showed up as a filename in the title bar
  const handleId = id ?? `host/browser-${++counter}/${file.name}`
  rawFiles.set(handleId, file)
  return handleId
}

export function hasFilePicker(): boolean {
  const w = globalThis as unknown as FsWindow
  return typeof w.showOpenFilePicker === 'function' && typeof w.showSaveFilePicker === 'function'
}

/**
 * A file the native host is holding for the app to open — e.g. the user picked
 * "Open with GenOffice" on a PDF in another app (Android ACTION_VIEW). The host
 * exposes a one-shot provider; whichever app entry point consumes it first wins
 * (only one app runs per WebView, so there is no contention).
 */
export interface PendingOpenFile {
  name: string
  data: Uint8Array
  /** a SAF content:// uri (writable) or a synthetic handle id */
  handleId: string
  writable: boolean
}

type PendingOpenProvider = () => Promise<PendingOpenFile | null>

/** Consume the host's pending file once, or null when there is none. */
export async function consumePendingOpenFile(): Promise<PendingOpenFile | null> {
  const provider = (globalThis as { __genofficeConsumePendingOpen?: PendingOpenProvider })
    .__genofficeConsumePendingOpen
  if (typeof provider !== 'function') return null
  try {
    return (await provider()) ?? null
  } catch {
    return null
  }
}

/** Whether the host holds a pending file, without consuming it (sheets' boot
 * probe asks before deciding to auto-open). */
export async function hasPendingOpenFile(): Promise<boolean> {
  const peek = (globalThis as { __genofficeHasPendingOpen?: () => Promise<boolean> })
    .__genofficeHasPendingOpen
  if (typeof peek !== 'function') return false
  try {
    return !!(await peek())
  } catch {
    return false
  }
}

/** Turn a pending file into an OpenResult, registering reads for it. */
export function openResultFromPending(pending: PendingOpenFile): OpenResult {
  const handle: FileHandle = {
    id: pending.handleId,
    name: pending.name,
    writable: pending.writable,
  }
  // a non-writable snapshot needs a raw File so readFromHandle can answer; a
  // writable SAF handle is read/written through the native hooks instead
  if (!pending.writable) {
    registerRawFile(pending.handleId, new File([pending.data.slice()], pending.name))
  }
  return { ok: true, handle, data: pending.data }
}

export function rememberHandle(handle: FileSystemFileHandle, kind?: DocumentKind): BrowserFileHandle {
  // same shape as grantFile: the last segment is the display name, because
  // callers split the string rather than reading handle.name
  const id = `host/browser-${++counter}/${handle.name}`
  liveHandles.set(id, handle)
  // exactOptionalPropertyTypes: an absent kind must be an absent key, not
  // `kind: undefined`, which the `DocumentKind` optional property rejects
  return {
    id,
    name: handle.name,
    ...(kind ? { kind } : {}),
    writable: true,
    native: handle,
  }
}

export function lookupHandle(id: string): FileSystemFileHandle | undefined {
  return liveHandles.get(id)
}

export async function openViaPicker(kind?: DocumentKind): Promise<OpenResult> {
  const w = globalThis as unknown as FsWindow
  if (!w.showOpenFilePicker) return { ok: false, reason: 'unsupported' }
  try {
    const types = kind
      ? [{ description: kind.toUpperCase(), accept: { 'application/octet-stream': [EXT_BY_KIND[kind]] } }]
      : undefined
    const [picked] = await w.showOpenFilePicker(types ? { types, multiple: false } : { multiple: false })
    if (!picked) return { ok: false, reason: 'canceled' }
    const file = await picked.getFile()
    const data = new Uint8Array(await file.arrayBuffer())
    const hash = await sha256Hex(data)
    const handle = rememberHandle(picked, kind)
    // keep the File too: a caller that only needs a URL for the bytes can hand
    // out URL.createObjectURL(file) instead of re-encoding what we just read
    rawFiles.set(handle.id, file)
    return { ok: true, handle, data, hash }
  } catch (error) {
    // an aborted picker rejects with AbortError; that is a cancel, not a fault
    if (error instanceof Error && error.name === 'AbortError') return { ok: false, reason: 'canceled' }
    return { ok: false, reason: 'error', error: String(error) }
  }
}

export async function saveViaPicker(data: Uint8Array, suggestedName: string, kind?: DocumentKind): Promise<OpenResult> {
  const w = globalThis as unknown as FsWindow
  if (!w.showSaveFilePicker) return { ok: false, reason: 'unsupported' }
  try {
    const handle = await w.showSaveFilePicker({
      suggestedName,
      types: kind ? [{ description: kind.toUpperCase(), accept: { 'application/octet-stream': [EXT_BY_KIND[kind]] } }] : undefined,
    })
    const writable = await (handle as unknown as { createWritable(): Promise<FileSystemWritableFileStream> }).createWritable()
    await writable.write(toArrayBuffer(data))
    await writable.close()
    return { ok: true, handle: rememberHandle(handle, kind), data }
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') return { ok: false, reason: 'canceled' }
    return { ok: false, reason: 'error', error: String(error) }
  }
}

export async function writeToHandle(handle: FileHandle, data: Uint8Array): Promise<{ ok: boolean; error?: string }> {
  // a native host (Android SAF) writes through its own resolver; the browser
  // FileSystemFileHandle path below cannot see a content:// handle
  const nativeWrite = (
    globalThis as {
      __genofficeSaveInPlaceViaNative?: (handleId: string, data: Uint8Array) => Promise<{ ok: boolean; error?: string }>
    }
  ).__genofficeSaveInPlaceViaNative
  if (typeof nativeWrite === 'function') return nativeWrite(handle.id, data)
  // a plain File is read-only: replacing it needs a destination the user picked
  if (rawFiles.has(handle.id)) {
    return { ok: false, error: 'a granted File cannot be rewritten in place; use saveAs' }
  }
  const native = lookupHandle(handle.id)
  if (!native) return { ok: false, error: 'handle is not writable in this host' }
  try {
    const writable = await (native as unknown as { createWritable(): Promise<FileSystemWritableFileStream> }).createWritable()
    await writable.write(toArrayBuffer(data))
    await writable.close()
    return { ok: true }
  } catch (error) {
    return { ok: false, error: String(error) }
  }
}

export async function readFromHandle(handle: FileHandle): Promise<Uint8Array | null> {
  // a native host (Android SAF) reads through its own resolver
  const nativeRead = (
    globalThis as { __genofficeReadViaNative?: (handleId: string) => Promise<Uint8Array | null> }
  ).__genofficeReadViaNative
  if (typeof nativeRead === 'function') return nativeRead(handle.id)
  // a plain File (no picker handle) answers the same way
  const raw = rawFiles.get(handle.id)
  if (raw) {
    try {
      return new Uint8Array(await raw.arrayBuffer())
    } catch {
      return null
    }
  }
  const native = lookupHandle(handle.id)
  if (!native) return null
  try {
    const file = await native.getFile()
    return new Uint8Array(await file.arrayBuffer())
  } catch {
    return null
  }
}

/**
 * Copy bytes into a plain `ArrayBuffer`.
 *
 * `Uint8Array` is generic over its backing buffer since TS 5.7, and a value may
 * be backed by `SharedArrayBuffer`; the DOM's write/digest signatures require a
 * real `ArrayBuffer`, so hand them a copy rather than casting the type away.
 */
export function toArrayBuffer(data: Uint8Array): ArrayBuffer {
  const copy = new ArrayBuffer(data.byteLength)
  new Uint8Array(copy).set(data)
  return copy
}

// sha256Hex lives in ./node-globals.ts — it is the same helper the engine
// shims need, so there is exactly one implementation
/**
 * Save by handing the bytes to the browser's download machinery.
 *
 * saveViaPicker() needs showSaveFilePicker, which is desktop Chromium. Android
 * Chrome and Android WebViews do not ship it, so on the actual target platform the
 * picker path returns 'unsupported' and a user who edits a document has nowhere to
 * put the result. Measured: with both pickers removed, saveDocxAs resolves to null
 * and nothing is written.
 *
 * A download is not as good as a picker — the file lands in the Downloads folder
 * with a name the browser chose, not where the user pointed — but it is a real save,
 * and it is the only one available there. The alternative is losing the work.
 */
export async function saveViaDownload(
  data: Uint8Array,
  suggestedName: string,
): Promise<OpenResult> {
  try {
    const blob = new Blob([toArrayBuffer(data)])
    const url = URL.createObjectURL(blob)
    try {
      const anchor = document.createElement('a')
      anchor.href = url
      anchor.download = suggestedName
      anchor.rel = 'noopener'
      // Some WebViews ignore click() on a detached node; keep it in the document
      // for the duration of the click.
      anchor.style.display = 'none'
      document.body.appendChild(anchor)
      anchor.click()
      anchor.remove()
    } finally {
      // revoking immediately can cancel the download in some browsers; give the
      // click a turn of the event loop first
      setTimeout(() => URL.revokeObjectURL(url), 10_000)
    }
    // There is no handle: the browser owns the file from here. The caller gets a
    // synthetic name so it can show something honest in the title bar.
    return {
      ok: true,
      handle: { id: 'host/download/' + suggestedName, name: suggestedName, writable: false },
      data,
    }
  } catch (error) {
    return { ok: false, reason: 'error', error: String(error) }
  }
}

/**
 * Save through whichever mechanism this host actually has.
 *
 * A picker is preferred because the user chooses the location and the app keeps a
 * writable handle for later saves. Where it does not exist, fall back to a download
 * rather than failing — refusing to save is the one outcome a document editor must
 * not produce when the user asked to save.
 */
export async function saveAnywhere(
  data: Uint8Array,
  suggestedName: string,
  kind?: DocumentKind,
): Promise<OpenResult> {
  // A native host (Android SAF) supplies an awaitable save that returns a
  // writable handle. It must win over the download fallback: a download is
  // fire-and-forget, so the session would report "saved" while the native
  // picker is still waiting for the user.
  const nativeSave = (
    globalThis as { __genofficeSaveViaNative?: (data: Uint8Array, name: string) => Promise<OpenResult> }
  ).__genofficeSaveViaNative
  if (typeof nativeSave === 'function') return nativeSave(data, suggestedName)
  const w = globalThis as unknown as FsWindow
  if (typeof w.showSaveFilePicker === 'function') {
    return saveViaPicker(data, suggestedName, kind)
  }
  return saveViaDownload(data, suggestedName)
}
/**
 * Open a file through <input type="file">.
 *
 * The twin of saveViaDownload, and needed for the same reason: showOpenFilePicker
 * is desktop Chromium, so on an Android browser or WebView openViaPicker() answers
 * 'unsupported' and the Open button cannot produce a file at all. An editor that
 * cannot open a document is a blank page with a toolbar.
 *
 * The trade-off matches the save side: an <input type=file> hands back a File with
 * no writable handle, so later in-place saves are impossible and the app must treat
 * the document as save-as-only. That is still strictly better than not opening.
 */
export function openViaInput(kind?: DocumentKind): Promise<OpenResult> {
  return new Promise((resolve) => {
    const input = document.createElement('input')
    input.type = 'file'
    if (kind) {
      const ext = EXT_BY_KIND[kind]
      input.accept = ext.startsWith('.') ? ext : '.' + ext
    }
    input.style.display = 'none'

    let settled = false
    const finish = (result: OpenResult): void => {
      if (settled) return
      settled = true
      input.remove()
      resolve(result)
    }

    input.addEventListener('change', () => {
      const file = input.files?.[0]
      if (!file) {
        finish({ ok: false, reason: 'canceled' })
        return
      }
      void (async () => {
        try {
          const data = new Uint8Array(await file.arrayBuffer())
          const hash = await sha256Hex(data)
          // a plain File has no writable handle: grantFile records it as a raw file,
          // which is what makes an in-place save fail with a reason instead of
          // silently dropping the write
          const id = grantFile(file)
          finish({ ok: true, handle: { id, name: file.name, writable: false }, data, hash })
        } catch (error) {
          finish({ ok: false, reason: 'error', error: String(error) })
        }
      })()
    })

    // A cancelled <input type=file> fires no event in most browsers; if the user
    // never picks anything the promise would hang. There is no reliable cancel
    // signal, so the caller is left to time out or ignore it — but when the window
    // regains focus with no files chosen, treat that as a cancel.
    window.addEventListener(
      'focus',
      () => {
        setTimeout(() => {
          if (!input.files || input.files.length === 0) finish({ ok: false, reason: 'canceled' })
        }, 500)
      },
      { once: true },
    )

    document.body.appendChild(input)
    input.click()
  })
}

/**
 * Open through whichever mechanism this host has: the File System Access picker
 * when present (it yields a writable handle), otherwise an <input type=file>.
 */
export async function openAnywhere(kind?: DocumentKind): Promise<OpenResult> {
  // a file the host is holding (ACTION_VIEW "open with") wins over any picker
  const pending = await consumePendingOpenFile()
  if (pending) return openResultFromPending(pending)
  // A native host (Android SAF) supplies an awaitable open with a writable
  // handle — preferred over <input type=file>, whose File snapshot cannot be
  // written back in place.
  const nativeOpen = (
    globalThis as { __genofficeOpenViaNative?: (kind?: DocumentKind) => Promise<OpenResult> }
  ).__genofficeOpenViaNative
  if (typeof nativeOpen === 'function') return nativeOpen(kind)
  const w = globalThis as unknown as FsWindow
  if (typeof w.showOpenFilePicker === 'function') return openViaPicker(kind)
  return openViaInput(kind)
}
