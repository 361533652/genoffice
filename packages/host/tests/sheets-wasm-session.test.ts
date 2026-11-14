/**
 * The workbook session host, end to end over the real wasm engine.
 *
 * This is the proof that sheets' desktop session semantics run on a mobile
 * host: open a real workbook, edit a cell, save through the streaming
 * pipeline, read the edit back from the NEW session, and re-open the saved
 * bytes to confirm they persist. No Electron, no Node filesystem — the same
 * WASI shim a WebView uses.
 *
 * Requires the wasm artifact:
 *   cargo build --target wasm32-wasip1 --release  (in apps/sheets/native/xlsx-engine)
 * The suite skips with a clear message when it is absent.
 */
import { existsSync, readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, test } from 'vitest'
import type { FileHandle, FileHost, OpenResult } from '@genoffice/host-contract'
import { WasmSidecarClient } from '../src/sheets/wasm-sidecar.js'
import { WorkbookSessionHost, type WorkbookSaveRequestLike } from '../src/sheets/session.js'

const here = dirname(fileURLToPath(import.meta.url))
const repo = join(here, '..', '..', '..')
const WASM = join(
  repo,
  'apps', 'sheets', 'native', 'xlsx-engine',
  'target', 'wasm32-wasip1', 'release', 'xlsx_sidecar.wasm',
)
const BLANK = join(repo, 'apps', 'shell', 'build', 'shell-new', 'blank.xlsx')
const available = existsSync(WASM) && existsSync(BLANK)

/** An in-memory FileHost: handles are keys, saves land in a map. */
function memoryFileHost(initial: { name: string; bytes: Uint8Array }): {
  files: FileHost
  saved: Map<string, Uint8Array>
} {
  const saved = new Map<string, Uint8Array>()
  let counter = 0
  const handle = (name: string): FileHandle => ({
    id: `mem-${++counter}/${name}`,
    name,
    writable: true,
  })
  const files: FileHost = {
    open: async (): Promise<OpenResult> => ({
      ok: true,
      handle: handle(initial.name),
      data: initial.bytes,
    }),
    saveAs: async (data, name): Promise<OpenResult> => {
      const h = handle(name)
      saved.set(h.id, new Uint8Array(data))
      return { ok: true, handle: h, data }
    },
    saveInPlace: async (h, data) => {
      saved.set(h.id, new Uint8Array(data))
      return { ok: true }
    },
    read: async (h) => saved.get(h.id) ?? null,
    rename: async () => ({ ok: false, error: 'not needed in tests' }),
  }
  return { files, saved }
}

function saveRequest(
  sessionId: string,
  edits: WorkbookSaveRequestLike['edits'],
  extra: Partial<WorkbookSaveRequestLike> = {},
): WorkbookSaveRequestLike {
  return {
    sessionId,
    mode: 'save',
    edits,
    structuralOps: [],
    chartEdits: [],
    visualEdits: [],
    visualAdditions: [],
    tableAdditions: [],
    pivotAdditions: [],
    sheetOps: [],
    sheetOrder: [],
    filterStates: [],
    hyperlinkEdits: [],
    cfStates: [],
    dvStates: [],
    pageSetupStates: [],
    noteStates: [],
    formulaValues: [],
    pivotCacheRefreshPaths: [],
    pivotRefreshUpdates: [],
    sheetProtections: [],
    ...extra,
  }
}

interface OpenedWorkbook {
  sessionId: string
  sheets: { id: string; name: string }[]
  styles: unknown[]
  path: string
  sha256: string
}

describe.skipIf(!available)('workbook session over the wasm sidecar', () => {
  async function setup(): Promise<{
    session: WorkbookSessionHost
    opened: OpenedWorkbook
    saved: Map<string, Uint8Array>
  }> {
    const bytes = new Uint8Array(readFileSync(BLANK))
    const client = await WasmSidecarClient.create({ wasm: new Uint8Array(readFileSync(WASM)) })
    const { files, saved } = memoryFileHost({ name: 'blank.xlsx', bytes })
    const session = new WorkbookSessionHost(client, files)
    const opened = (await session.selectWorkbook()) as OpenedWorkbook
    return { session, opened, saved }
  }

  test('open answers a full WorkbookFile with a live session', async () => {
    const { session, opened } = await setup()
    expect(opened.sessionId).toMatch(/^[0-9a-f-]{36}$/)
    expect(opened.sheets[0]?.name).toBe('Sheet1')
    expect(Array.isArray(opened.styles)).toBe(true)
    expect(opened.sha256).toHaveLength(64)
    const range = (await session.readRange({
      sessionId: opened.sessionId,
      sheetId: opened.sheets[0]!.id,
      range: { startRow: 0, endRow: 0, startColumn: 0, endColumn: 0 },
    })) as { cells: unknown[] }
    expect(Array.isArray(range.cells)).toBe(true)
  }, 60_000)

  test('a cell edit survives save, session swap and re-open', async () => {
    const { session, opened, saved } = await setup()
    const sheetId = opened.sheets[0]!.id
    const result = (await session.save(
      saveRequest(opened.sessionId, [
        { sheetId, row: 0, column: 0, writeValue: true, value: 'genoffice-wasm' },
      ]),
    )) as { canceled: boolean; file: OpenedWorkbook; touchedEntries: string[] }
    expect(result.canceled).toBe(false)
    // the swap: a fresh session over the saved bytes
    expect(result.file.sessionId).not.toBe(opened.sessionId)
    expect(result.touchedEntries.length).toBeGreaterThan(0)

    // read back through the NEW session
    const range = (await session.readRange({
      sessionId: result.file.sessionId,
      sheetId: result.file.sheets[0]!.id,
      range: { startRow: 0, endRow: 0, startColumn: 0, endColumn: 0 },
    })) as { cells: { row: number; column: number; value: unknown }[] }
    const a1 = range.cells.find((cell) => cell.row === 0 && cell.column === 0)
    expect(a1?.value).toBe('genoffice-wasm')

    // the old session is gone
    await expect(
      session.readRange({
        sessionId: opened.sessionId,
        sheetId,
        range: { startRow: 0, endRow: 0, startColumn: 0, endColumn: 0 },
      }),
    ).rejects.toThrow('Unknown workbook session')

    // the written bytes re-open with the edit intact (persistence round-trip)
    const written = [...saved.values()][0]
    expect(written).toBeDefined()
    const reopened = (await session.openBytes(written!, {
      id: 'mem-reopen/blank.xlsx',
      name: 'blank.xlsx',
      writable: true,
    })) as OpenedWorkbook
    const reread = (await session.readRange({
      sessionId: reopened.sessionId,
      sheetId: reopened.sheets[0]!.id,
      range: { startRow: 0, endRow: 0, startColumn: 0, endColumn: 0 },
    })) as { cells: { row: number; column: number; value: unknown }[] }
    expect(reread.cells.find((cell) => cell.row === 0 && cell.column === 0)?.value).toBe(
      'genoffice-wasm',
    )
  }, 120_000)

  test('recalc evaluates a formula through the session', async () => {
    const { session, opened } = await setup()
    const sheetId = opened.sheets[0]!.id
    const result = (await session.save(
      saveRequest(opened.sessionId, [
        { sheetId, row: 0, column: 0, writeValue: true, value: 1 },
        { sheetId, row: 1, column: 0, writeValue: true, value: 2 },
        { sheetId, row: 2, column: 0, writeValue: true, value: null, formula: 'A1+A2' },
      ]),
    )) as { canceled: boolean; file: OpenedWorkbook }
    expect(result.canceled).toBe(false)
    const recalc = (await session.recalc({
      sessionId: result.file.sessionId,
      edits: [],
      reads: [
        {
          sheetId: result.file.sheets[0]!.id,
          range: { startRow: 2, endRow: 2, startColumn: 0, endColumn: 0 },
        },
      ],
    })) as { cells: { row: number; column: number; formatted: string; isFormula: boolean }[] }
    const a3 = recalc.cells.find((cell) => cell.row === 2 && cell.column === 0)
    expect(a3?.formatted).toBe('3')
    expect(a3?.isFormula).toBe(true)
  }, 120_000)

  test('close releases the session and its snapshot', async () => {
    const { session, opened } = await setup()
    await session.close(opened.sessionId)
    await expect(
      session.readRange({
        sessionId: opened.sessionId,
        sheetId: opened.sheets[0]!.id,
        range: { startRow: 0, endRow: 0, startColumn: 0, endColumn: 0 },
      }),
    ).rejects.toThrow('Unknown workbook session')
  }, 60_000)
})
