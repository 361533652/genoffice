import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { expect, test, type Page } from '@playwright/test'

/**
 * xlsx on a mobile host: open a real workbook, edit a cell, save, and read the
 * edit back — with no Electron preload and no Node filesystem.
 *
 * The xlsx gateway was the hardest of the three engines to move: it wrote
 * through a temp directory and an atomic rename. It now runs against an
 * injected filesystem port (fs-memory.ts), and this test is the proof that the
 * in-memory host produces a workbook a reader can open again.
 */

const SHEETS_URL = process.env.MOBILE_SHEETS_URL ?? 'http://127.0.0.1:5201'
const REPO = process.cwd()

function entry(pkg: string, file: string): string {
  return '/@fs/' + join(REPO, 'packages', pkg, 'src', file).replace(/\\/g, '/')
}

async function bootSheets(page: Page): Promise<void> {
  await page.goto(SHEETS_URL, { waitUntil: 'load' })
  await expect(page.locator('.ribbon')).toBeVisible({ timeout: 30_000 })
}

test.describe('xlsx on a mobile host', () => {
  test('a cell edit survives a save and a re-read', async ({ page }) => {
    await bootSheets(page)
    const workbook = readFileSync(join(REPO, 'apps', 'shell', 'build', 'shell-new', 'blank.xlsx'))

    const result = await page.evaluate(
      async ({ base64, globals, host, memory, gateway }) => {
        const g = await import(globals)
        await g.installNodeGlobals()
        // no Node filesystem here: hand the gateway an in-memory one
        const h = await import(host)
        const m = await import(memory)
        h.configureGatewayHost({
          fs: m.createMemoryFileSystem(),
          paths: m.memoryPaths,
          uuid: () => crypto.randomUUID(),
        })

        const bin = atob(base64)
        const bytes = new Uint8Array(bin.length)
        for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
        const src = Buffer.from(bytes)

        const gw = await import(gateway)
        const basic = await gw.readBasicWorkbook(src)
        const sheetId = basic.snapshot.sheets[0].id
        const sheetName = basic.sheetNamesById[sheetId]

        const mutated = await gw.applyPlanToXlsx(
          src,
          {
            transactionId: 't1',
            baseRevision: 0,
            cellChanges: [
              {
                sheetId,
                address: 'A1',
                before: { value: null },
                after: { value: 'genoffice-mobile' },
              },
            ],
            sheetRenames: [],
            structuralChanges: [],
            formatChanges: [],
            warnings: [],
          },
          basic.sheetNamesById,
        )

        const rows = await gw.readSheetRows(Buffer.from(mutated.buffer), sheetName)
        return {
          sheetName,
          a1: rows?.[0]?.[0] ?? null,
          touched: mutated.touchedEntries,
          grew: mutated.buffer.length > src.length,
        }
      },
      {
        base64: workbook.toString('base64'),
        globals: entry('host', 'node-globals.ts'),
        host: entry('xlsx-gateway', 'gateway/gateway-host.ts'),
        memory: entry('xlsx-gateway', 'gateway/fs-memory.ts'),
        gateway: entry('xlsx-gateway', 'gateway/xlsx-gateway.ts'),
      },
    )

    expect(result.sheetName).toBe('Sheet1')
    // the value round-tripped through the saved package, not just the planner
    expect(result.a1).toBe('genoffice-mobile')
    expect(result.touched).toContain('xl/worksheets/sheet1.xml')
    expect(result.grew).toBe(true)
  })

  test('the gateway imports with no node: built-in', async ({ page }) => {
    await bootSheets(page)
    const ok = await page.evaluate(
      async ({ globals, gateway }) => {
        const g = await import(globals)
        await g.installNodeGlobals()
        const mod = await import(gateway)
        return typeof mod.readBasicWorkbook === 'function' && typeof mod.applyPlanToXlsx === 'function'
      },
      { globals: entry('host', 'node-globals.ts'), gateway: entry('xlsx-gateway', 'gateway/xlsx-gateway.ts') },
    )
    expect(ok).toBe(true)
  })
})
