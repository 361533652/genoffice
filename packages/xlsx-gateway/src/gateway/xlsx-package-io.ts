/**
 * The sidecar streaming path is desktop-only.
 *
 * It extracts package entries into a real temp directory and passes file paths
 * to a native process, so it cannot run in a WebView at all. Rather than
 * pretending otherwise, the Node imports are dynamic and every entry point
 * refuses with a clear error when the host has no filesystem.
 *
 * The mobile app never reaches these functions: it uses the in-memory
 * EntrySource + JSZip assembler instead (see adr 3).
 */
import { ensureGatewayHost, gatewayHost } from './gateway-host'

import { z } from 'zod'

import { MAX_PATCH_ENTRY_BYTES } from '../shared/edit-schemas'
import type { WorkbookChartEdit, WorkbookVisualEdit } from '../shared/edit-schemas'
import type { SheetFilterState } from './xlsx-filter'
import type { DefinedNamesState } from './xlsx-defined-names'
import type { SheetPageSetupState } from './xlsx-page-setup'
import type { SheetRedactionState } from './xlsx-redaction'
import type {
  CellEdit,
  BulkConstantFill,
  EntrySource,
  MutationPlan,
  PivotRefreshUpdate,
  SheetCfState,
  SheetDvState,
  SheetHyperlinkEdits,
  SheetNoteState,
  SheetProtectedRangesState,
  SheetProtectionState,
  SheetTabColorState,
  SheetPivotAddition,
  SheetSlicerState,
  SheetSparklineAddition,
  SheetStructuralOps,
  SheetTableAddition,
  SheetTableEdit,
  SheetVisualAddition,
  SheetFormulaValues,
  SheetCellImageAddition,
  ExternalLinkOps,
} from './xlsx-gateway'
import { planCellEditsToXlsx, syncFileBestEffort } from './xlsx-gateway'
import { normalizeOoxmlPartPrefix } from './xlsx-namespace'
import type { WorkbookThemeState } from './xlsx-theme'
import type { SheetEditPlan } from './xlsx-sheets'

const archiveEntrySchema = z.object({
  name: z.string(),
  crc32: z.number(),
  compressedSize: z.number(),
  uncompressedSize: z.number(),
})

export type ArchiveEntry = z.infer<typeof archiveEntrySchema>

const manifestResultSchema = z.object({ entries: z.array(archiveEntrySchema) })
const readEntriesResultSchema = z.object({
  entries: z.array(z.object({ name: z.string(), path: z.string() })),
})
const scanEntriesResultSchema = z.object({ matches: z.array(z.string()) })
const saveArchiveResultSchema = z.object({
  beforeEntries: z.array(archiveEntrySchema),
  afterEntries: z.array(archiveEntrySchema),
})

/// The subset of XlsxSidecarClient the streaming save path needs; tests can
/// substitute a stub.
export interface ArchiveClient {
  archiveManifest(path: string): Promise<unknown>
  readEntries(input: {
    readonly path: string
    readonly entries: readonly string[]
    readonly outputDir: string
  }): Promise<unknown>
  scanEntries(input: {
    readonly path: string
    readonly entries: readonly string[]
    readonly needle: string
  }): Promise<unknown>
  saveArchive(input: {
    readonly sourcePath: string
    readonly targetPath: string
    readonly replacements: readonly { name: string; contentPath: string }[]
    readonly removals: readonly string[]
    readonly additions: readonly { name: string; contentPath: string }[]
  }): Promise<unknown>
}

export interface StreamingSaveRequest {
  readonly client: ArchiveClient
  readonly sourcePath: string
  readonly targetPath: string
  readonly edits: readonly CellEdit[]
  readonly bulkConstantFills?: readonly BulkConstantFill[] | undefined
  readonly structuralOps?: readonly SheetStructuralOps[] | undefined
  readonly chartEdits?: readonly WorkbookChartEdit[] | undefined
  readonly sheetPlan?: SheetEditPlan | undefined
  readonly filterStates?: readonly SheetFilterState[] | undefined
  readonly hyperlinkEdits?: readonly SheetHyperlinkEdits[] | undefined
  readonly cfStates?: readonly SheetCfState[] | undefined
  readonly dvStates?: readonly SheetDvState[] | undefined
  readonly sheetProtections?: readonly SheetProtectionState[] | undefined
  readonly definedNamesState?: DefinedNamesState | null | undefined
  readonly visualAdditions?: readonly SheetVisualAddition[] | undefined
  readonly pageSetupStates?: readonly SheetPageSetupState[] | undefined
  readonly noteStates?: readonly SheetNoteState[] | undefined
  readonly tableAdditions?: readonly SheetTableAddition[] | undefined
  readonly tableEdits?: readonly SheetTableEdit[] | undefined
  /// Session-created pictures in cells ("Place in Cell").
  readonly cellImageAdditions?: readonly SheetCellImageAddition[] | undefined
  readonly pivotAdditions?: readonly SheetPivotAddition[] | undefined
  readonly pivotCacheRefreshPaths?: readonly string[] | undefined
  readonly pivotRefreshUpdates?: readonly PivotRefreshUpdate[] | undefined
  readonly visualEdits?: readonly WorkbookVisualEdit[] | undefined
  readonly sparklineAdditions?: readonly SheetSparklineAddition[] | undefined
  /// Session slicer/timeline panels written as x14/x15 slicer parts; null =
  /// no slicer changes ride this save.
  readonly slicerState?: SheetSlicerState | null | undefined
  /// Recalculated formula-cell values written into <v>
  readonly formulaValues?: readonly SheetFormulaValues[] | undefined
  /// External-link breaks and source retargets, resolved on the final contents
  readonly externalLinkOps?: ExternalLinkOps | null | undefined
  readonly themeState?: WorkbookThemeState | null | undefined
  readonly workbookProtectionState?: { readonly lockStructure: boolean } | null | undefined
  readonly protectedRangeStates?: readonly SheetProtectedRangesState[] | undefined
  readonly tabColorStates?: readonly SheetTabColorState[] | undefined
  /** null/undefined = the caller does not know the marks; the part is left as it is */
  readonly redactionStates?: readonly SheetRedactionState[] | null | undefined
}

export interface StreamingSaveResult {
  readonly touchedEntries: readonly string[]
  readonly removedEntries: readonly string[]
  readonly addedEntries: readonly string[]
}

/// One-shot text read of an archive entry via the sidecar (extract to a
/// temp dir, read, clean up).
export async function readArchiveEntryText(
  client: ArchiveClient,
  sourcePath: string,
  entryName: string,
): Promise<string> {
  const host = await ensureGatewayHost()
  const scratch = await host.fs.makeScratchDir()
  try {
    const extracted = readEntriesResultSchema.parse(
      await client.readEntries({ path: sourcePath, entries: [entryName], outputDir: scratch.dir }),
    )
    const filePath = extracted.entries[0]?.path
    if (!filePath) throw new Error(`Workbook is missing ${entryName}.`)
    return normalizeOoxmlPartPrefix(decodeText(await host.fs.readFile(filePath)))
  } finally {
    await scratch.dispose()
  }
}

/// One-shot text read of several archive entries via the sidecar (extract to a
/// temp dir, read, clean up). The sidecar fails the whole request when one of
/// the names is missing, so the caller must ask for names it knows exist.
export async function readArchiveEntriesText(
  client: ArchiveClient,
  sourcePath: string,
  entryNames: readonly string[],
): Promise<Map<string, string>> {
  const out = new Map<string, string>()
  if (entryNames.length === 0) return out
  const host = await ensureGatewayHost()
  const scratch = await host.fs.makeScratchDir()
  try {
    const extracted = readEntriesResultSchema.parse(
      await client.readEntries({ path: sourcePath, entries: [...entryNames], outputDir: scratch.dir }),
    )
    for (const [index, entry] of extracted.entries.entries()) {
      const name = entryNames[index]
      if (name === undefined || !entry.path) continue
      out.set(name, normalizeOoxmlPartPrefix(decodeText(await host.fs.readFile(entry.path))))
    }
    return out
  } finally {
    await scratch.dispose()
  }
}

/** UTF-8 decode, replacing `readFileSync(path, 'utf8')`. */
function decodeText(bytes: Uint8Array): string {
  return new TextDecoder('utf-8').decode(bytes)
}

/// Streaming save channel: the gateway plans patched entry contents in
/// memory, the sidecar reassembles the archive on disk — untouched entries
/// are raw-copied compressed bytes, verified afterwards via CRC manifests.
export async function saveWorkbookViaSidecar(
  request: StreamingSaveRequest,
): Promise<StreamingSaveResult> {
  const host = await ensureGatewayHost()
  const scratch = await host.fs.makeScratchDir()
  const workDir = scratch.dir
  const temporaryTarget = host.paths.join(
    host.paths.dirname(request.targetPath),
    `${host.paths.basename(request.targetPath)}.${host.uuid()}.tmp`,
  )
  try {
    const manifest = manifestResultSchema.parse(
      await request.client.archiveManifest(request.sourcePath),
    ).entries
    const source = createSidecarEntrySource(request.client, request.sourcePath, manifest, workDir)
    const plan = await planCellEditsToXlsx(
      source,
      request.edits,
      request.structuralOps ?? [],
      request.chartEdits ?? [],
      request.sheetPlan,
      request.filterStates ?? [],
      request.hyperlinkEdits ?? [],
      request.cfStates ?? [],
      request.dvStates ?? [],
      request.sheetProtections ?? [],
      request.definedNamesState ?? null,
      request.visualAdditions ?? [],
      request.pageSetupStates ?? [],
      request.noteStates ?? [],
      request.tableAdditions ?? [],
      request.pivotAdditions ?? [],
      request.pivotCacheRefreshPaths ?? [],
      request.pivotRefreshUpdates ?? [],
      request.visualEdits ?? [],
      request.sparklineAdditions ?? [],
      request.formulaValues ?? [],
      request.themeState ?? null,
      request.workbookProtectionState ?? null,
      request.protectedRangeStates ?? [],
      request.bulkConstantFills ?? [],
      request.tabColorStates ?? [],
      request.tableEdits ?? [],
      request.cellImageAdditions ?? [],
      request.externalLinkOps ?? null,
      request.redactionStates ?? null,
      request.slicerState ?? null,
    )

    const replacements = await writePlanContents(workDir, 'replace', plan.replaced)
    const additions = [
      ...(await writePlanContents(workDir, 'add', plan.added)),
      ...(await writePlanContents(workDir, 'add-bin', plan.addedBinary)),
    ]
    const result = saveArchiveResultSchema.parse(
      await request.client.saveArchive({
        sourcePath: request.sourcePath,
        targetPath: temporaryTarget,
        replacements,
        removals: plan.removedEntries,
        additions,
      }),
    )

    // The source manifest was read before planning; if the file changed on
    // disk in between, the save's own before-manifest exposes the drift.
    if (!manifestsEqual(manifest, result.beforeEntries)) {
      throw new Error('The workbook changed on disk while saving — aborted.')
    }
    assertManifestPreserved(plan, result.beforeEntries, result.afterEntries)

    await promoteFileAtomically(temporaryTarget, request.targetPath)
    return {
      touchedEntries: plan.touchedEntries,
      removedEntries: plan.removedEntries,
      addedEntries: plan.addedEntries,
    }
  } catch (error: unknown) {
    await host.fs.remove(temporaryTarget).catch(() => {})
    throw error
  } finally {
    await scratch.dispose()
  }
}

function createSidecarEntrySource(
  client: ArchiveClient,
  sourcePath: string,
  manifest: readonly ArchiveEntry[],
  workDir: string,
): EntrySource {
  const entryByName = new Map(manifest.map((entry) => [entry.name, entry]))
  const cache = new Map<string, string>()
  let extractionCount = 0
  return {
    paths: async () => manifest.map((entry) => entry.name),
    has: async (path) => entryByName.has(path),
    canPatch: async (path) =>
      (entryByName.get(path)?.uncompressedSize ?? 0) <= MAX_PATCH_ENTRY_BYTES,
    containsText: async (path, needle) => {
      const scanned = scanEntriesResultSchema.parse(
        await client.scanEntries({ path: sourcePath, entries: [path], needle }),
      )
      return scanned.matches.includes(path)
    },
    releaseText: (path) => {
      cache.delete(path)
    },
    readText: async (path) => {
      const cached = cache.get(path)
      if (cached !== undefined) return cached
      const entry = entryByName.get(path)
      if (!entry) throw new Error(`Workbook is missing ${path}.`)
      if (entry.uncompressedSize > MAX_PATCH_ENTRY_BYTES) {
        throw new Error(
          `${path} is ${entry.uncompressedSize} bytes uncompressed — too large to edit. ` +
            'Entries above 500MB can be preserved but not patched.',
        )
      }
      const extractDir = (await ensureGatewayHost()).paths.join(workDir, `extract-${extractionCount}`)
      extractionCount += 1
      await (await ensureGatewayHost()).fs.makeDir(extractDir)
      const extracted = readEntriesResultSchema.parse(
        await client.readEntries({ path: sourcePath, entries: [path], outputDir: extractDir }),
      )
      const filePath = extracted.entries[0]?.path
      if (!filePath) throw new Error(`Sidecar did not extract ${path}.`)
      const content = normalizeOoxmlPartPrefix(decodeText(await (await ensureGatewayHost()).fs.readFile(filePath)))
      cache.set(path, content)
      return content
    },
  }
}

async function writePlanContents(
  workDir: string,
  prefix: string,
  contents: ReadonlyMap<string, string | Uint8Array>,
): Promise<{ name: string; contentPath: string }[]> {
  const host = await ensureGatewayHost()
  const written: { name: string; contentPath: string }[] = []
  let index = 0
  for (const [name, content] of contents) {
    const contentPath = host.paths.join(workDir, `${prefix}-${index}.bin`)
    index += 1
    // the host port takes whole bytes: chunked fd streaming was an allocation
    // optimisation for 300MB entries, and both hosts now materialise the bytes
    // once instead. The string branch still avoids a per-chunk Buffer.
    await host.fs.writeFile(
      contentPath,
      typeof content === 'string' ? utf8Chunked(content) : content,
    )
    written.push({ name, contentPath })
  }
  return written
}

/**
 * UTF-8 encode without splitting a surrogate pair.
 *
 * `TextEncoder` already handles surrogate pairs, but a lone surrogate at a
 * chunk boundary used to be replaced with U+FFFD by the old per-chunk Buffer
 * write. Encoding in one pass keeps that from happening at all.
 */
function utf8Chunked(content: string): Uint8Array {
  return new TextEncoder().encode(content)
}

function manifestsEqual(left: readonly ArchiveEntry[], right: readonly ArchiveEntry[]): boolean {
  if (left.length !== right.length) return false
  const key = (entry: ArchiveEntry): string =>
    `${entry.name}\u0000${entry.crc32}\u0000${entry.compressedSize}\u0000${entry.uncompressedSize}`
  const leftKeys = new Set(left.map(key))
  return right.every((entry) => leftKeys.has(key(entry)))
}

/// Fails closed when the saved archive differs from the source anywhere the
/// plan did not declare: untouched entries must survive byte-preserving raw
/// copy (identical CRC and sizes), removals must vanish, additions must
/// appear, and nothing else may exist.
export function assertManifestPreserved(
  plan: Pick<MutationPlan, 'replaced' | 'added' | 'removedEntries'> &
    Partial<Pick<MutationPlan, 'addedBinary'>>,
  before: readonly ArchiveEntry[],
  after: readonly ArchiveEntry[],
): void {
  const removed = new Set(plan.removedEntries)
  const replaced = new Set(plan.replaced.keys())
  const added = new Set([...plan.added.keys(), ...(plan.addedBinary?.keys() ?? [])])
  const beforeByName = new Map(before.map((entry) => [entry.name, entry]))
  const afterByName = new Map(after.map((entry) => [entry.name, entry]))

  for (const entry of before) {
    const saved = afterByName.get(entry.name)
    if (removed.has(entry.name)) {
      if (saved) throw new Error(`Saving should have removed ${entry.name} but did not — aborted.`)
      continue
    }
    if (!saved) throw new Error(`Saving would drop ${entry.name} — aborted.`)
    if (replaced.has(entry.name)) continue
    if (
      saved.crc32 !== entry.crc32 ||
      saved.compressedSize !== entry.compressedSize ||
      saved.uncompressedSize !== entry.uncompressedSize
    ) {
      throw new Error(`Saving would unexpectedly modify ${entry.name} — aborted.`)
    }
  }
  for (const name of added) {
    if (beforeByName.has(name)) {
      throw new Error(`Saving should have created ${name} but it already existed — aborted.`)
    }
    if (!afterByName.has(name)) {
      throw new Error(`Saving should have created ${name} but did not — aborted.`)
    }
  }
  for (const entry of after) {
    if (!beforeByName.has(entry.name) && !added.has(entry.name)) {
      throw new Error(`Saving would unexpectedly create ${entry.name} — aborted.`)
    }
  }
}

/** Transient Windows codes: antivirus/indexer/cloud sync briefly locks a path. */
const RETRYABLE_RENAME_CODES = new Set(['EPERM', 'EACCES', 'EBUSY'])
const RENAME_RETRIES = 4

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

/**
 * Same-directory temp + rename keeps the save atomic. Windows refuses the
 * rename with EPERM/EACCES/EBUSY while antivirus, search indexing, or cloud
 * sync briefly holds either path (user report: "EPERM: operation not permitted,
 * rename .tmp.xlsx → …") — retry with backoff, then fall back to copying the
 * finished bytes over the target in place; the temp file survives until the
 * copy lands. The in-place copy truncates the target before writing, so the
 * target is backed up first and restored if the copy dies halfway (the caller
 * deletes the temp on failure). A persistent lock (the workbook is open in
 * Excel) still fails: surface an actionable message instead of the raw errno,
 * keyed by a stable substring for the renderer's save-error localization table.
 */
export async function promoteFileAtomically(temporaryPath: string, path: string): Promise<void> {
  await syncFileBestEffort(temporaryPath)
  const host = await ensureGatewayHost()
  for (let attempt = 0; ; attempt += 1) {
    try {
      await host.fs.replaceFile(temporaryPath, path)
      return
    } catch (error) {
      const code = (error as NodeJS.ErrnoException).code ?? ''
      if (!RETRYABLE_RENAME_CODES.has(code)) throw error
      if (attempt >= RENAME_RETRIES) break
      await sleep(50 * 2 ** attempt)
    }
  }
  await copyOverLockedTarget(temporaryPath, path)
  await host.fs.remove(temporaryPath).catch(() => {})
}

const lockedTargetError = (path: string, cause: unknown) =>
  new Error(`The save target is locked by another program: ${path}`, { cause })

async function copyOverLockedTarget(temporaryPath: string, path: string): Promise<void> {
  const host = await ensureGatewayHost()
  const before = await readFileSize(path)
  const backup = before !== null ? host.paths.join(host.paths.tmpdir(), recoveredName(path, host.uuid())) : null
  if (backup) {
    try {
      await host.fs.copyFile(path, backup)
    } catch (error) {
      const code = (error as NodeJS.ErrnoException).code ?? ''
      throw RETRYABLE_RENAME_CODES.has(code) ? lockedTargetError(path, error) : error
    }
  }
  try {
    await host.fs.copyFile(temporaryPath, path)
  } catch (error) {
    if (backup && before !== null) {
      const after = await readFileSize(path)
      const untouched = after === before
      const restored =
        untouched ||
        (await host.fs.copyFile(backup, path).then(
          () => true,
          () => false,
        ))
      if (!restored) {
        // deliberately not matched by the renderer's localization table so
        // the surviving path reaches the user verbatim
        const survivor = await preserveBackup(backup, path)
        throw new Error(
          `The save target ${path} could not be restored after a failed save; the previous workbook contents were preserved at: ${survivor}`,
          { cause: error },
        )
      }
      await host.fs.remove(backup).catch(() => {})
    }
    const code = (error as NodeJS.ErrnoException).code ?? ''
    throw RETRYABLE_RENAME_CODES.has(code) ? lockedTargetError(path, error) : error
  }
  if (backup) await host.fs.remove(backup).catch(() => {})
}

/**
 * A cheap identity for "did this file change?".
 *
 * Was `stat()` comparing size and mtime; the port does not expose stat, and
 * the comparison only guards the restore path, so size plus a content read is
 * enough — a same-size, same-second edit during a failed save is not a case
 * worth carrying a stat port for.
 */
async function readFileSize(path: string): Promise<number | null> {
  try {
    return (await (await ensureGatewayHost()).fs.readFile(path)).byteLength
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return null
    throw error
  }
}

/**
 * Openable as a workbook wherever it ends up: keeps the name and extension.
 *
 * Deliberately synchronous and host-free: it is pure string surgery on a name,
 * and callers use it inside `join(...)` expressions where an await would force
 * the whole chain async for no benefit.
 */
const recoveredName = (path: string, tag: string) => {
  const slash = path.lastIndexOf('/')
  const dir = slash >= 0 ? path.slice(0, slash + 1) : ''
  const base = path.slice(slash + 1)
  const dot = base.lastIndexOf('.')
  const stem = dot > 0 ? base.slice(0, dot) : base
  const ext = dot > 0 ? base.slice(dot) : ''
  return `${dir}${stem}.recovered-${tag}${ext}`
}

/** Move the backup next to the workbook (temp dirs get swept); keep it where it is if that fails too. */
async function preserveBackup(backup: string, path: string): Promise<string> {
  const host = await ensureGatewayHost()
  const recovered = host.paths.join(host.paths.dirname(path), recoveredName(path, String(Date.now())))
  try {
    await host.fs.copyFile(backup, recovered)
  } catch {
    return backup
  }
  await host.fs.remove(backup).catch(() => {})
  return recovered
}
