/**
 * Install the workbook session host: the wasm sidecar + the session layer,
 * wired into the legacy bridge so the sheets renderer's `desktopApi` calls
 * reach real implementations instead of desktop-only refusals.
 *
 * Opt-in by design: a host calls this when it can serve the engine asset
 * (Android WebView injection, a deployed browser build, or a test). Hosts
 * that never call it keep the honest refusals — nothing changes for them.
 *
 * The engine and the gateway load lazily (dynamic import) so the six apps'
 * boot bundles do not carry the xlsx pipeline unless sheets actually uses it.
 */
import type { FileHost } from '@genoffice/host-contract'
import { registerBridgeOverride } from '../legacy-desktop-bridge.js'
import { openAnywhere, readFromHandle, saveAnywhere, writeToHandle } from '../files.js'

export interface SheetsSessionInstallOptions {
  /** xlsx_sidecar.wasm bytes, or a URL to fetch them from */
  wasm: Uint8Array | string
  /** file access; defaults to the browser primitives (picker/download) */
  files?: FileHost
  language?: string
  shortDateFormat?: string
  onDiagnostic?: (line: string) => void
}

export interface SheetsSessionHandle {
  uninstall(): void
}

/** The browser FileHost: the same primitives the legacy shim already uses. */
export function browserFileHost(): FileHost {
  return {
    open: (kind) => openAnywhere(kind),
    saveAs: (data, name) => saveAnywhere(data, name, 'xlsx'),
    saveInPlace: (handle, data) => writeToHandle(handle, data),
    read: (handle) => readFromHandle(handle),
    rename: async () => ({ ok: false, error: 'rename needs the desktop host' }),
  }
}

export async function installSheetsSessionHost(
  options: SheetsSessionInstallOptions,
): Promise<SheetsSessionHandle> {
  const [{ WasmSidecarClient }, { WorkbookSessionHost }] = await Promise.all([
    import('./wasm-sidecar.js'),
    import('./session.js'),
  ])
  const client = await WasmSidecarClient.create({
    wasm: options.wasm,
    ...(options.onDiagnostic ? { onDiagnostic: options.onDiagnostic } : {}),
  })
  const session = new WorkbookSessionHost(client, options.files ?? browserFileHost(), {
    ...(options.language === undefined ? {} : { language: options.language }),
    ...(options.shortDateFormat === undefined ? {} : { shortDateFormat: options.shortDateFormat }),
  })

  const registrations: [string, (...args: never[]) => unknown][] = [
    ['selectWorkbook', () => session.selectWorkbook()],
    ['readWorkbookRange', (request) => session.readRange(request as Parameters<typeof session.readRange>[0])],
    ['readWorkbookFormulas', (request) => session.readFormulas(request as { sessionId: string; sheetId: string })],
    ['readWorkbookRowOutline', (request) => session.readRowOutline(request as { sessionId: string; sheetId: string })],
    ['readWorkbookMedia', (request) => session.readMedia(request as { sessionId: string; visualId: string })],
    ['readSlicerState', (request) => session.readSlicerState(request as { sessionId: string })],
    ['readWorkbookQueries', (request) => session.readQueries(request as { sessionId: string })],
    ['findWorkbookCells', (request) => session.findCells(request as Record<string, unknown> & { sessionId: string })],
    ['recalcWorkbook', (request) => session.recalc(request as Parameters<typeof session.recalc>[0])],
    ['saveWorkbookEdits', (request) => session.save(request as Parameters<typeof session.save>[0])],
    ['writeWorkbookRecovery', (request) => session.writeRecovery(request)],
    ['closeWorkbook', (sessionId) => session.close(sessionId as string)],
    ['listWorkbookTabs', () => session.listWorkbookTabs()],
    ['reopenWorkbook', (handleId) => session.reopen(handleId as string)],
    ['listExternalLinks', (request) => session.listExternalLinks(request as { sessionId: string })],
    ['updateExternalLinks', (request) => session.updateExternalLinks(request as { sessionId: string })],
    ['readExternalLinkUsage', (request) => session.readExternalLinkUsage(request as { sessionId: string })],
    // single-tab host: the cross-workbook pick has no other tab to arm
    ['armWorkbookPick', () => ({ pickId: '' })],
    ['cancelWorkbookPick', () => undefined],
    ['sendWorkbookPickSelection', () => undefined],
  ]
  const unregisters = registrations.map(([name, fn]) =>
    registerBridgeOverride(name, fn as (...args: unknown[]) => unknown),
  )
  // readiness marker: tests and the Android host poll this before driving the
  // workbook UI (the wasm fetch + compile is async)
  ;(globalThis as { __genofficeSheetsSessionReady?: boolean }).__genofficeSheetsSessionReady = true
  // the live session host, for diagnostics and test read-back
  ;(globalThis as { __genofficeSheetsSessionHost?: unknown }).__genofficeSheetsSessionHost = session
  return {
    uninstall(): void {
      for (const unregister of unregisters) unregister()
      delete (globalThis as { __genofficeSheetsSessionReady?: boolean }).__genofficeSheetsSessionReady
      client.stop()
    },
  }
}
