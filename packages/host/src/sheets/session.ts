/**
 * The workbook session host: desktop `sheets-main.ts` semantics on a mobile
 * host, backed by the wasm sidecar.
 *
 * What is ported (behaviour-identical to the desktop main process):
 *  - open: snapshot the bytes, hand the SNAPSHOT to the engine, register the
 *    session, answer a WorkbookFile carrying the sessionId (openWorkbookSession)
 *  - reads: session-guarded forwards (readWorkbookRange & co.)
 *  - recalc: sheetId → file sheet name resolution against the session
 *  - save: the full edit-plan builder (writeWorkbookTo) + the gateway's
 *    streaming save pipeline (saveWorkbookViaSidecar) + the post-save session
 *    swap, so reads after a save match the saved bytes
 *
 * What is adapted (the host has no paths, dialogs or shell):
 *  - the "file" is a FileHandle from the host's FileHost; writing back goes
 *    through saveInPlace when the handle is writable, saveAs otherwise
 *  - paths are virtual (/data, /tmp) inside the WASI tree the engine sees
 *  - crash recovery copies are NOT persisted yet: writeWorkbookRecovery
 *    answers {ok:false} honestly instead of pretending to protect the user
 *  - single tab: listWorkbookTabs answers [], the cross-workbook pick is inert
 */
import type { FileHandle, FileHost, OpenResult } from '@genoffice/host-contract'
import {
  configureGatewayHost,
} from '@genoffice/xlsx-gateway/gateway/gateway-host'
import {
  readArchiveEntriesText,
  readArchiveEntryText,
  saveWorkbookViaSidecar,
  type StreamingSaveRequest,
} from '@genoffice/xlsx-gateway/gateway/xlsx-package-io'
import { parseSlicerState } from '@genoffice/xlsx-gateway/gateway/xlsx-slicer'
import { listWorkbookQueries } from '@genoffice/xlsx-gateway/gateway/xlsx-connections'
import type {
  BulkConstantFill,
  CellEdit,
  SheetStructuralOps,
} from '@genoffice/xlsx-gateway/gateway/xlsx-gateway'
import type { SheetEditPlan } from '@genoffice/xlsx-gateway/gateway/xlsx-sheets'
import { sha256Hex } from '../node-globals.js'
import { createShimFileSystem, shimPaths } from './shim-fs.js'
import type { WasmSidecarClient } from './wasm-sidecar.js'

/** Same threshold as apps/sheets/src/main/recovery-policy.ts. */
const MAX_AUTOMATIC_RECOVERY_WORKSHEET_XML_BYTES = 64 * 1024 * 1024

interface SessionInfo {
  /** the user-facing handle (SAF uri / browser file), the write-back target */
  handle: FileHandle
  /** virtual path of the opened bytes inside the WASI tree */
  virtualPath: string
  /** the engine streams from this snapshot, never the live file */
  snapshotPath: string
  sha256: string
  fileBytes: number
  sheetNames: Map<string, string>
  needsSaveAs: boolean
}

/** The save request shape the renderer sends (workbookSaveRequestSchema). */
export interface WorkbookSaveRequestLike {
  sessionId: string
  mode: 'save' | 'save-as'
  quiet?: boolean
  defaultName?: string
  edits: readonly {
    sheetId: string
    row: number
    column: number
    writeValue: boolean
    value: unknown
    formula?: string
    style?: unknown
    rich?: unknown
    styleReset?: boolean
  }[]
  bulkConstantFills?: readonly (Record<string, unknown> & { sheetId: string })[]
  structuralOps: readonly (Record<string, unknown> & { sheetId: string; kind: string })[]
  chartEdits: readonly unknown[]
  visualEdits: readonly unknown[]
  visualAdditions: readonly (Record<string, unknown> & { sheetId: string })[]
  cellImageAdditions?: readonly (Record<string, unknown> & { sheetId: string })[]
  tableAdditions: readonly (Record<string, unknown> & { sheetId: string })[]
  tableEdits?: readonly (Record<string, unknown> & { sheetId: string })[]
  pivotAdditions: readonly (Record<string, unknown> & { sheetId: string; sourceSheetId: string })[]
  sheetOps: readonly (Record<string, unknown> & { sheetId: string; kind: string })[]
  sheetOrder: readonly string[]
  filterStates: readonly (Record<string, unknown> & { sheetId: string })[]
  hyperlinkEdits: readonly (Record<string, unknown> & { sheetId: string })[]
  cfStates: readonly (Record<string, unknown> & { sheetId: string })[]
  dvStates: readonly (Record<string, unknown> & { sheetId: string })[]
  pageSetupStates: readonly (Record<string, unknown> & { sheetId: string })[]
  noteStates: readonly (Record<string, unknown> & { sheetId: string })[]
  formulaValues: readonly {
    sheetId: string
    row: number
    column: number
    value: string | number | boolean | null | { error: string }
  }[]
  pivotCacheRefreshPaths: readonly string[]
  pivotRefreshUpdates: readonly (Record<string, unknown> & { sheetId: string })[]
  sheetProtections: readonly (Record<string, unknown> & { sheetId: string })[]
  protectedRangeStates?: readonly (Record<string, unknown> & { sheetId: string })[]
  sparklineAdditions?: readonly (Record<string, unknown> & { sheetId: string })[]
  slicerState?: {
    slicers: readonly (Record<string, unknown> & { sheetId: string })[]
    removals: readonly unknown[]
  } | null
  definedNamesState?: unknown
  themeState?: unknown
  workbookProtectionState?: unknown
  redactionStates?: readonly {
    sheetName: string
    marks: readonly (Record<string, unknown> & {
      startRow: number
      endRow: number
      startColumn: number
      endColumn: number
      label: string
    })[]
  }[] | null
  externalLinkOps?: unknown
}

export interface WorkbookSessionOptions {
  language?: string
  shortDateFormat?: string
}

export class WorkbookSessionHost {
  private readonly sessions = new Map<string, SessionInfo>()
  private readonly fs: ReturnType<typeof createShimFileSystem>
  private gatewayConfigured = false

  constructor(
    private readonly client: WasmSidecarClient,
    private readonly files: FileHost,
    private readonly options: WorkbookSessionOptions = {},
  ) {
    this.fs = createShimFileSystem(client.tree)
  }

  /** Point the gateway at the same virtual tree the engine sees. */
  private ensureGateway(): void {
    if (this.gatewayConfigured) return
    configureGatewayHost({
      fs: this.fs,
      paths: shimPaths,
      uuid: () => crypto.randomUUID(),
    })
    this.gatewayConfigured = true
  }

  // ---- open ---------------------------------------------------------------

  /** selectWorkbook(): pick a file through the host, open a session over it. */
  async selectWorkbook(): Promise<unknown | null> {
    const picked = await this.files.open('xlsx')
    if (!picked.ok) return null
    return this.openBytes(picked.data, picked.handle)
  }

  /** Open raw bytes under a handle (also the reopen / recovery path). */
  async openBytes(bytes: Uint8Array, handle: FileHandle): Promise<unknown> {
    this.ensureGateway()
    const id = crypto.randomUUID()
    const safeName = handle.name.replace(/[^\w.\-]+/g, '_') || 'workbook.xlsx'
    const virtualPath = `/data/${id}/${safeName}`
    const snapshotPath = `/tmp/snapshots/${id}.xlsx`
    await this.fs.writeFile(virtualPath, bytes)
    await this.fs.copyFile(virtualPath, snapshotPath)
    const sha256 = await sha256Hex(bytes)
    const opened = (await this.client.open(
      snapshotPath,
      this.options.language ?? 'zh',
      this.options.shortDateFormat,
    )) as Record<string, unknown> & {
      sessionId: string
      sheets: { id: string; name: string; sourceXmlBytes?: number }[]
    }
    // The desktop main parses the open result through zod, whose defaults fill
    // fields a sidecar omits when empty (sparklines, pivotTables, activeTab).
    // The renderer reads them without guards, so apply the same defaults here.
    const sheets = opened.sheets.map((sheet) => ({
      ...sheet,
      sparklines: (sheet as { sparklines?: unknown }).sparklines ?? [],
      pivotTables: (sheet as { pivotTables?: unknown }).pivotTables ?? [],
    }))
    const session: SessionInfo = {
      handle,
      virtualPath,
      snapshotPath,
      sha256,
      fileBytes: bytes.byteLength,
      sheetNames: new Map(opened.sheets.map((sheet) => [sheet.id, sheet.name])),
      needsSaveAs: handle.writable === false,
    }
    this.sessions.set(opened.sessionId, session)
    return {
      ...opened,
      sheets,
      activeTab: opened.activeTab ?? 0,
      path: handle.id,
      sha256,
      fileBytes: bytes.byteLength,
      readOnly: false,
      needsSaveAs: session.needsSaveAs || undefined,
      passwordProtected: false,
      restoredFromRecovery: false,
      automaticRecoveryDisabled: !opened.sheets.every(
        (sheet) =>
          sheet.sourceXmlBytes === undefined ||
          sheet.sourceXmlBytes <= MAX_AUTOMATIC_RECOVERY_WORKSHEET_XML_BYTES,
      ),
    }
  }

  private session(sessionId: string): SessionInfo {
    const session = this.sessions.get(sessionId)
    if (!session) throw new Error('Unknown workbook session.')
    return session
  }

  // ---- reads (session-guarded forwards, like the desktop handlers) --------

  async readRange(request: {
    sessionId: string
    sheetId: string
    range: { startRow: number; endRow: number; startColumn: number; endColumn: number }
  }): Promise<unknown> {
    this.session(request.sessionId)
    return this.client.readRange(request)
  }

  async readFormulas(request: { sessionId: string; sheetId: string }): Promise<unknown> {
    this.session(request.sessionId)
    return this.client.readFormulaCells(request)
  }

  async readRowOutline(request: { sessionId: string; sheetId: string }): Promise<unknown> {
    this.session(request.sessionId)
    return this.client.readRowOutline(request)
  }

  async readMedia(request: { sessionId: string; visualId: string }): Promise<unknown> {
    this.session(request.sessionId)
    return this.client.readMedia(request)
  }

  async findCells(request: Record<string, unknown> & { sessionId: string }): Promise<unknown> {
    this.session(request.sessionId)
    return this.client.findCells(request)
  }

  /** recalcWorkbook: sheet ids resolve through the session's file names. */
  async recalc(request: {
    sessionId: string
    edits: readonly { sheetId: string; row: number; column: number; input: string }[]
    reads: readonly {
      sheetId: string
      range: { startRow: number; endRow: number; startColumn: number; endColumn: number }
    }[]
  }): Promise<unknown> {
    const session = this.session(request.sessionId)
    const fileSheetName = (sheetId: string): string => {
      const name = session.sheetNames.get(sheetId)
      if (name === undefined) throw new Error(`Unknown sheet for recalculation: ${sheetId}`)
      return name
    }
    const result = (await this.client.recalcCells({
      path: session.snapshotPath,
      edits: request.edits.map((edit) => ({
        sheet: fileSheetName(edit.sheetId),
        row: edit.row,
        column: edit.column,
        input: edit.input,
      })),
      reads: request.reads.map((read) => ({
        sheet: fileSheetName(read.sheetId),
        range: read.range,
      })),
    })) as {
      cells: {
        sheet: string
        row: number
        column: number
        formatted: string
        number?: number
        isError?: boolean
        isFormula: boolean
      }[]
    }
    const idsByName = new Map([...session.sheetNames].map(([id, name]) => [name, id]))
    return {
      cells: result.cells.flatMap((cell) => {
        const sheetId = idsByName.get(cell.sheet)
        if (sheetId === undefined) return []
        return [
          {
            sheetId,
            row: cell.row,
            column: cell.column,
            formatted: cell.formatted,
            ...(cell.number === undefined ? {} : { number: cell.number }),
            ...(cell.isError ? { isError: true } : {}),
            isFormula: cell.isFormula,
          },
        ]
      }),
    }
  }

  // ---- open-time metadata reads (slicers, queries) ------------------------

  /** readSlicerState: the session snapshot's slicer/timeline parts, parsed. */
  async readSlicerState(request: { sessionId: string }): Promise<unknown> {
    const session = this.session(request.sessionId)
    const manifest = (await this.client.archiveManifest(session.snapshotPath)) as {
      entries: { name: string }[]
    }
    const names = manifest.entries.map((entry) => entry.name)
    const hasSlicerParts = names.some((name) =>
      /^xl\/(?:slicers|timelines)\/[^/]+\.xml$/.test(name),
    )
    if (!hasSlicerParts) return []
    const wanted = names.filter(
      (name) =>
        name === 'xl/workbook.xml' ||
        name === 'xl/_rels/workbook.xml.rels' ||
        /^xl\/(?:slicers|timelines|slicerCaches|timelineCaches|pivotTables)\/[^/]+\.xml$/.test(name) ||
        /^xl\/pivotCache\/pivotCacheDefinition\d*\.xml$/.test(name) ||
        /^xl\/worksheets\/(?:_rels\/)?[^/]+\.xml(?:\.rels)?$/.test(name),
    )
    const texts = await readArchiveEntriesText(this.client, session.snapshotPath, wanted)
    return parseSlicerState({
      paths: async () => names,
      readText: async (path) => {
        const text = texts.get(path)
        if (text === undefined) throw new Error(`Workbook is missing ${path}.`)
        return text
      },
    })
  }

  /** readWorkbookQueries: the snapshot's refreshable queries, parsed. */
  async readQueries(request: { sessionId: string }): Promise<unknown> {
    const session = this.session(request.sessionId)
    const manifest = (await this.client.archiveManifest(session.snapshotPath)) as {
      entries: { name: string }[]
    }
    const names = new Set(manifest.entries.map((entry) => entry.name))
    return listWorkbookQueries((path) =>
      names.has(path)
        ? readArchiveEntryText(this.client, session.snapshotPath, path)
        : Promise.resolve(undefined),
    )
  }

  // ---- external links (file-level scans over the session's own bytes) -----

  async listExternalLinks(request: { sessionId: string }): Promise<unknown> {
    const session = this.session(request.sessionId)
    return this.client.listExternalLinks({ path: session.virtualPath })
  }

  async updateExternalLinks(request: { sessionId: string }): Promise<unknown> {
    const session = this.session(request.sessionId)
    return this.client.updateExternalLinks({ path: session.virtualPath })
  }

  async readExternalLinkUsage(request: { sessionId: string }): Promise<unknown> {
    const session = this.session(request.sessionId)
    return this.client.readExternalLinkUsage({ path: session.virtualPath })
  }

  // ---- save ---------------------------------------------------------------

  /**
   * saveWorkbookEdits: build the edit plan, run the streaming save pipeline
   * against the snapshot, write the bytes back through the host, then swap
   * the session for a fresh one over the saved file (desktop parity).
   */
  async save(request: WorkbookSaveRequestLike): Promise<unknown> {
    this.ensureGateway()
    const session = this.session(request.sessionId)
    const targetPath = `/tmp/save-${crypto.randomUUID()}/${session.handle.name.replace(/[^\w.\-]+/g, '_') || 'workbook.xlsx'}`
    // the engine writes a .tmp beside the target before promoting it; the
    // desktop target dir always exists, here we have to create it
    await this.fs.makeDir(shimPaths.dirname(targetPath))
    const plan = buildSavePlan(session, request)
    const mutation = await saveWorkbookViaSidecar({
      client: this.client,
      sourcePath: session.snapshotPath,
      targetPath,
      ...plan,
    } as StreamingSaveRequest)
    const bytes = await this.fs.readFile(targetPath)

    // Write back: in place when the handle allows it, otherwise a host save-as
    // (download on a browser, SAF create-document on Android). A plain Save on
    // a non-writable handle degrades to Save As — the same degradation the
    // docs/markdown/html hosts already document.
    let handle = session.handle
    const saveAs = request.mode === 'save-as' || session.needsSaveAs || handle.writable === false
    if (saveAs) {
      const name = request.defaultName ?? handle.name
      const saved: OpenResult = await this.files.saveAs(bytes, name)
      if (!saved.ok) return { canceled: true }
      handle = saved.handle
    } else {
      const written = await this.files.saveInPlace(handle, bytes)
      if (!written.ok) {
        const saved: OpenResult = await this.files.saveAs(bytes, handle.name)
        if (!saved.ok) return { canceled: true }
        handle = saved.handle
      }
    }

    // The session swap: close the old engine session, snapshot the saved
    // bytes, open a fresh session so reads match what was just written.
    await this.client.close(request.sessionId).catch(() => undefined)
    await this.fs.remove(session.snapshotPath).catch(() => undefined)
    this.sessions.delete(request.sessionId)
    await this.fs.writeFile(session.virtualPath, bytes)
    const file = await this.openBytes(bytes, handle)
    await this.fs.remove(shimPaths.dirname(targetPath)).catch(() => undefined)
    return { canceled: false, file, touchedEntries: mutation.touchedEntries }
  }

  /**
   * Crash-recovery copies need a persistent store the mobile host does not
   * have yet. Answering {ok:false} is the honest best-effort answer (the
   * renderer never prompts on it); claiming ok would promise protection that
   * does not exist. Tracked in BROWSER_HOST_LIMITATIONS.
   */
  async writeRecovery(_request: unknown): Promise<{ ok: boolean }> {
    return { ok: false }
  }

  // ---- close / tabs -------------------------------------------------------

  async close(sessionId: string): Promise<void> {
    const session = this.sessions.get(sessionId)
    if (!this.sessions.delete(sessionId)) return
    if (session) {
      await this.client.close(sessionId).catch(() => undefined)
      await this.fs.remove(session.snapshotPath).catch(() => undefined)
    }
  }

  /** Single-tab host: no other workbook tabs exist to pick from. */
  listWorkbookTabs(): { tabs: never[] } {
    return { tabs: [] }
  }

  /** Diagnostic: live sessions and their sheet ids (host debugging, tests). */
  debugSessions(): { sessionId: string; sheetIds: string[] }[] {
    return [...this.sessions.entries()].map(([sessionId, session]) => ({
      sessionId,
      sheetIds: [...session.sheetNames.keys()],
    }))
  }

  /** reopenWorkbook: re-open a handle this host already holds. */
  async reopen(handleId: string): Promise<unknown | null> {
    for (const session of this.sessions.values()) {
      if (session.handle.id === handleId) {
        const bytes = await this.files.read(session.handle)
        if (!bytes) return null
        await this.close([...this.sessions.keys()].find((id) => this.sessions.get(id) === session)!)
        return this.openBytes(bytes, session.handle)
      }
    }
    return null
  }
}

// ---- the edit-plan builder (ported from sheets-main.ts writeWorkbookTo) ----

type PlanArguments = Omit<StreamingSaveRequest, 'client' | 'sourcePath' | 'targetPath'>

function buildSavePlan(session: SessionInfo, request: WorkbookSaveRequestLike): PlanArguments {
  // Sheet ops resolve first: added sheets have Univer ids the session map
  // doesn't know, so cell edits into them resolve through the op's name.
  const addedSheetNames = new Map<string, string>()
  const duplicateSources = new Map<string, string>()
  const renames: { sheetName: string; newName: string }[] = []
  const removals: string[] = []
  const hiddenChanges: { sheetName: string; hidden: boolean }[] = []
  const tabColorStates: { sheetName: string; color: string | null }[] = []
  let orderChanged = false
  for (const op of request.sheetOps) {
    if (op.kind === 'add-sheet') {
      addedSheetNames.set(op.sheetId, op.name as string)
      continue
    }
    if (op.kind === 'duplicate-sheet') {
      const sourceName = session.sheetNames.get(op.sourceSheetId as string)
      if (!sourceName) throw new Error(`Unknown duplicate source ${String(op.sourceSheetId)}.`)
      addedSheetNames.set(op.sheetId, op.name as string)
      duplicateSources.set(op.sheetId, sourceName)
      continue
    }
    if (op.kind === 'reorder-sheets') {
      orderChanged = true
      continue
    }
    const sheetName = addedSheetNames.get(op.sheetId) ?? session.sheetNames.get(op.sheetId)
    if (!sheetName) throw new Error(`Unknown worksheet ${op.sheetId}.`)
    if (op.kind === 'rename-sheet') renames.push({ sheetName, newName: op.newName as string })
    else if (op.kind === 'set-sheet-hidden') {
      hiddenChanges.push({ sheetName, hidden: op.hidden as boolean })
    } else if (op.kind === 'set-sheet-tab-color') {
      tabColorStates.push({ sheetName, color: (op.color as string | null) ?? null })
    } else removals.push(sheetName)
  }
  const renameByOriginal = new Map(renames.map((rename) => [rename.sheetName, rename.newName]))
  const resolveSheetName = (sheetId: string): string => {
    const sheetName = addedSheetNames.get(sheetId) ?? session.sheetNames.get(sheetId)
    if (!sheetName) throw new Error(`Unknown worksheet ${sheetId}.`)
    return sheetName
  }
  let sheetPlan: SheetEditPlan | undefined
  if (request.sheetOps.some((op) => op.kind !== 'set-sheet-tab-color')) {
    sheetPlan = {
      renames,
      additions: [...addedSheetNames].map(([sheetId, name]) => ({
        name,
        sourceSheetName: duplicateSources.get(sheetId),
      })),
      removals,
      hiddenChanges,
      orderChanged,
      order: request.sheetOrder.map((sheetId) => {
        const original = resolveSheetName(sheetId)
        return addedSheetNames.has(sheetId)
          ? original
          : (renameByOriginal.get(original) ?? original)
      }),
    }
  }

  const edits: CellEdit[] = request.edits.map((edit) => ({
    sheetName: resolveSheetName(edit.sheetId),
    row: edit.row,
    column: edit.column,
    writeValue: edit.writeValue,
    cell: { value: edit.value, formula: edit.formula } as CellEdit['cell'],
    style: edit.style as CellEdit['style'],
    rich: edit.rich as CellEdit['rich'],
    styleReset: edit.styleReset,
  }))
  const bulkConstantFills = (request.bulkConstantFills ?? []).map(
    ({ sheetId, ...fill }) =>
      ({ sheetName: resolveSheetName(sheetId), ...fill }) as unknown as BulkConstantFill,
  )
  const opsBySheet = new Map<string, SheetStructuralOps['ops'][number][]>()
  for (const op of request.structuralOps) {
    const sheetName = resolveSheetName(op.sheetId)
    const sheetOps = opsBySheet.get(sheetName) ?? []
    if ('range' in op) {
      sheetOps.push({ kind: op.kind, range: op.range } as SheetStructuralOps['ops'][number])
    } else if ('size' in op) {
      sheetOps.push({
        kind: op.kind,
        start: op.start,
        end: op.end,
        size: op.size,
      } as SheetStructuralOps['ops'][number])
    } else if ('level' in op) {
      sheetOps.push({
        kind: op.kind,
        start: op.start,
        end: op.end,
        level: op.level,
        ...(op.collapsed === undefined ? {} : { collapsed: op.collapsed }),
      } as SheetStructuralOps['ops'][number])
    } else if ('summaryBelow' in op) {
      sheetOps.push({
        kind: op.kind,
        summaryBelow: op.summaryBelow,
        summaryRight: op.summaryRight,
      } as SheetStructuralOps['ops'][number])
    } else if ('hidden' in op) {
      sheetOps.push({
        kind: op.kind,
        start: op.start,
        end: op.end,
        hidden: op.hidden,
      } as SheetStructuralOps['ops'][number])
    } else if ('style' in op) {
      sheetOps.push({
        kind: op.kind,
        start: op.start,
        end: op.end,
        style: op.style,
      } as SheetStructuralOps['ops'][number])
    } else if ('before' in op) {
      sheetOps.push({
        kind: op.kind,
        index: op.index,
        count: op.count,
        before: op.before,
      } as SheetStructuralOps['ops'][number])
    } else {
      sheetOps.push({
        kind: op.kind,
        index: op.index,
        count: op.count,
      } as SheetStructuralOps['ops'][number])
    }
    opsBySheet.set(sheetName, sheetOps)
  }
  const structuralOps: SheetStructuralOps[] = [...opsBySheet].map(([sheetName, ops]) => ({
    sheetName,
    ops,
  }))
  const filterStates = request.filterStates.map((state) => ({
    sheetName: resolveSheetName(state.sheetId),
    filter: state.filter,
    hiddenRows: state.hiddenRows,
    visibilityRange: state.visibilityRange,
  }))
  const linksBySheet = new Map<string, { row: number; column: number; target: string | null }[]>()
  for (const link of request.hyperlinkEdits) {
    const sheetName = resolveSheetName(link.sheetId)
    const sheetLinks = linksBySheet.get(sheetName) ?? []
    sheetLinks.push({
      row: link.row as number,
      column: link.column as number,
      target: (link.target as string | null) ?? null,
    })
    linksBySheet.set(sheetName, sheetLinks)
  }
  const hyperlinkEdits = [...linksBySheet].map(([sheetName, links]) => ({
    sheetName,
    edits: links,
  }))
  const cfStates = request.cfStates.map((state) => ({
    sheetName: resolveSheetName(state.sheetId),
    rules: state.rules,
  }))
  const dvStates = request.dvStates.map((state) => ({
    sheetName: resolveSheetName(state.sheetId),
    rules: state.rules,
  }))
  const sheetProtections = request.sheetProtections.map(({ sheetId, ...state }) => ({
    sheetName: resolveSheetName(sheetId),
    ...state,
  }))
  const protectedRangeStates = (request.protectedRangeStates ?? []).map((state) => ({
    sheetName: resolveSheetName(state.sheetId),
    ranges: state.ranges,
  }))
  const pageSetupStates = request.pageSetupStates.map(({ sheetId, ...state }) => ({
    sheetName: resolveSheetName(sheetId),
    ...state,
  }))
  const noteStates = request.noteStates.map(({ sheetId, notes }) => ({
    sheetName: resolveSheetName(sheetId),
    notes,
  }))
  const visualAdditions = request.visualAdditions.map((addition) => ({
    sheetName: resolveSheetName(addition.sheetId),
    anchor: addition.anchor,
    chart: addition.chart,
    shape: addition.shape,
    image: addition.image,
  }))
  const cellImageAdditions = (request.cellImageAdditions ?? []).map(({ sheetId, ...addition }) => ({
    sheetName: resolveSheetName(sheetId),
    ...addition,
  }))
  const tableAdditions = request.tableAdditions.map((table) => ({
    sheetName: resolveSheetName(table.sheetId),
    area: table.area,
    name: table.name,
    columnNames: table.columnNames,
    style: table.style,
    bandedRows: table.bandedRows,
    options: table.options,
  }))
  const tableEdits = (request.tableEdits ?? []).map(({ sheetId, ...edit }) => ({
    ...edit,
    sheetName: resolveSheetName(sheetId),
  }))
  const pivotAdditions = request.pivotAdditions.map((pivot) => ({
    sheetName: resolveSheetName(pivot.sheetId),
    sourceSheetName: resolveSheetName(pivot.sourceSheetId),
    sourceArea: pivot.sourceArea,
    location: pivot.location,
    name: pivot.name,
    fieldNames: pivot.fieldNames,
    rowFieldIndices: pivot.rowFieldIndices,
    columnFieldIndex: pivot.columnFieldIndex,
    pageFieldIndices: pivot.pageFieldIndices,
    pageLevelItems: pivot.pageLevelItems,
    pageItems: pivot.pageItems,
    rowItems: pivot.rowItems,
    rowLevelItems: pivot.rowLevelItems,
    rowLines: pivot.rowLines,
    columnItems: pivot.columnItems,
    columnFieldIndices: pivot.columnFieldIndices,
    colLevelItems: pivot.colLevelItems,
    colLines: pivot.colLines,
    groupings: pivot.groupings,
    filters: pivot.filters,
    rowHiddenItems: pivot.rowHiddenItems,
    colHiddenItems: pivot.colHiddenItems,
    values: pivot.values,
  }))
  const sparklineAdditions = (request.sparklineAdditions ?? []).map(({ sheetId, ...group }) => ({
    sheetName: resolveSheetName(sheetId),
    ...group,
  }))
  const slicerState =
    request.slicerState === null || request.slicerState === undefined
      ? null
      : {
          slicers: request.slicerState.slicers.map(({ sheetId, ...control }) => ({
            ...control,
            sheetName: resolveSheetName(sheetId),
          })),
          removals: [...request.slicerState.removals],
        }
  const formulaValuesBySheet = new Map<
    string,
    { row: number; column: number; value: string | number | boolean | null | { error: string } }[]
  >()
  for (const cell of request.formulaValues) {
    const sheetName = resolveSheetName(cell.sheetId)
    const list = formulaValuesBySheet.get(sheetName) ?? []
    list.push({ row: cell.row, column: cell.column, value: cell.value })
    formulaValuesBySheet.set(sheetName, list)
  }
  const formulaValues = [...formulaValuesBySheet].map(([sheetName, cells]) => ({
    sheetName,
    cells,
  }))
  const redactionStates =
    (request.redactionStates ?? null)?.map((state) => ({
      sheetName: state.sheetName,
      marks: state.marks.map((mark) => ({
        startRow: mark.startRow,
        endRow: mark.endRow,
        startColumn: mark.startColumn,
        endColumn: mark.endColumn,
        label: mark.label,
        ...('previousFill' in mark ? { previousFill: (mark.previousFill as string | null) ?? null } : {}),
      })),
    })) ?? null

  return {
    edits,
    bulkConstantFills,
    structuralOps,
    chartEdits: request.chartEdits as StreamingSaveRequest['chartEdits'],
    visualEdits: request.visualEdits as StreamingSaveRequest['visualEdits'],
    sheetPlan,
    filterStates: filterStates as StreamingSaveRequest['filterStates'],
    hyperlinkEdits,
    cfStates: cfStates as StreamingSaveRequest['cfStates'],
    dvStates: dvStates as StreamingSaveRequest['dvStates'],
    sheetProtections: sheetProtections as unknown as StreamingSaveRequest['sheetProtections'],
    tabColorStates,
    definedNamesState: request.definedNamesState as StreamingSaveRequest['definedNamesState'],
    themeState: request.themeState as StreamingSaveRequest['themeState'],
    workbookProtectionState:
      request.workbookProtectionState as StreamingSaveRequest['workbookProtectionState'],
    protectedRangeStates: protectedRangeStates as StreamingSaveRequest['protectedRangeStates'],
    visualAdditions: visualAdditions as StreamingSaveRequest['visualAdditions'],
    cellImageAdditions: cellImageAdditions as unknown as StreamingSaveRequest['cellImageAdditions'],
    pageSetupStates: pageSetupStates as StreamingSaveRequest['pageSetupStates'],
    noteStates: noteStates as StreamingSaveRequest['noteStates'],
    tableAdditions: tableAdditions as StreamingSaveRequest['tableAdditions'],
    tableEdits: tableEdits as unknown as StreamingSaveRequest['tableEdits'],
    pivotAdditions: pivotAdditions as StreamingSaveRequest['pivotAdditions'],
    sparklineAdditions: sparklineAdditions as unknown as StreamingSaveRequest['sparklineAdditions'],
    slicerState: slicerState as StreamingSaveRequest['slicerState'],
    formulaValues,
    pivotCacheRefreshPaths: request.pivotCacheRefreshPaths,
    pivotRefreshUpdates: request.pivotRefreshUpdates.map((update) => ({
      cachePath: update.cachePath,
      sheetName: resolveSheetName(update.sheetId),
      newOutputRef: update.newOutputRef,
      ...(update.relayout === undefined
        ? {}
        : {
            relayout: (({ sheetId: _sheetId, sourceSheetId, ...rest }) => ({
              ...rest,
              sourceSheetName: resolveSheetName(sourceSheetId as string),
            }))(update.relayout as Record<string, unknown> & { sheetId: string; sourceSheetId: string }),
          }),
    })) as unknown as StreamingSaveRequest['pivotRefreshUpdates'],
    redactionStates: redactionStates as StreamingSaveRequest['redactionStates'],
    externalLinkOps: request.externalLinkOps as StreamingSaveRequest['externalLinkOps'],
  }
}
