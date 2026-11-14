import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { expect, test } from '@playwright/test'

/**
 * sheets on a mobile host: open a real workbook through the UI, type into a
 * cell, save, and reopen the saved file — the whole loop running on the wasm
 * sidecar (the same Rust engine the desktop spawns), with no Electron and no
 * File System Access API (the Android shape).
 *
 * This is the user path, not the engine path: the open button, the file
 * chooser, the canvas grid, the save button and the download fallback are all
 * the app's own. Cell values live on canvas, so the read-back assertion goes
 * through the formula bar (DOM) after re-selecting A1.
 *
 * Requires the wasm artifact:
 *   cargo build --target wasm32-wasip1 --release  (apps/sheets/native/xlsx-engine)
 */

const SHEETS_URL = process.env.MOBILE_SHEETS_URL ?? 'http://127.0.0.1:5201'
const REPO = process.cwd()
const WASM = join(
  REPO,
  'apps', 'sheets', 'native', 'xlsx-engine',
  'target', 'wasm32-wasip1', 'release', 'xlsx_sidecar.wasm',
)
const BLANK = join(REPO, 'apps', 'shell', 'build', 'shell-new', 'blank.xlsx')

test.skip(!existsSync(WASM) || !existsSync(BLANK), 'wasm artifact or fixture missing')

/** center of cell A1: right of the ~46px row header, below the ~24px column header */
async function clickA1(page: import('@playwright/test').Page): Promise<void> {
  const grid = await page.evaluate(() => {
    for (const canvas of document.querySelectorAll('canvas')) {
      const rect = canvas.getBoundingClientRect()
      if (rect.width > 300 && rect.height > 200) return { x: rect.x, y: rect.y }
    }
    return null
  })
  if (!grid) throw new Error('worksheet canvas not found')
  await page.mouse.click(grid.x + 46 + 43, grid.y + 24 + 12)
}

test('a workbook opens, edits and saves through the wasm session', async ({ page }) => {
  test.setTimeout(180_000)
  const errors: string[] = []
  const consoleLines: string[] = []
  const failedRequests: string[] = []
  page.on('pageerror', (e) => errors.push(String(e.stack ?? e)))
  page.on('console', (msg) => consoleLines.push(`[${msg.type()}] ${msg.text()}`))
  page.on('requestfailed', (req) => failedRequests.push(`${req.url()} — ${req.failure()?.errorText}`))
  // replacing the open workbook asks for confirmation; accept it
  page.on('dialog', (d) => void d.accept())

  await page.addInitScript((wasmUrl: string) => {
    const w = window as unknown as Record<string, unknown>
    // the Android shape: neither picker exists
    Object.defineProperty(w, 'showOpenFilePicker', { configurable: true, value: undefined })
    Object.defineProperty(w, 'showSaveFilePicker', { configurable: true, value: undefined })
    w.__genofficeSheetsWasmUrl = wasmUrl
  }, '/@fs/' + WASM.replace(/\\/g, '/'))

  await page.goto(SHEETS_URL, { waitUntil: 'load' })
  await expect(page.locator('.ribbon')).toBeVisible({ timeout: 30_000 })
  try {
    await page.waitForFunction(
      () => (window as unknown as { __genofficeSheetsSessionReady?: boolean }).__genofficeSheetsSessionReady === true,
      null,
      { timeout: 30_000 },
    )
  } catch (error) {
    throw new Error(
      `session host not ready.\nconsole:\n${consoleLines.join('\n')}\nfailed requests:\n${failedRequests.join('\n')}`,
    )
  }

  // ── open through the app's own button + file chooser ──
  const [chooser] = await Promise.all([
    page.waitForEvent('filechooser'),
    page.getByRole('button', { name: /打开/ }).first().click(),
  ])
  await chooser.setFiles(BLANK)
  // the sheet tab strip is DOM even though the grid is canvas
  await page.waitForFunction(() => document.body.textContent?.includes('Sheet1'), null, {
    timeout: 30_000,
  })
  await page.waitForTimeout(1_500)

  // ── type into A1 ──
  await clickA1(page)
  await expect(page.locator('[data-u-comp="defined-name"] input')).toHaveValue('A1')
  await page.keyboard.type('HelloWasm', { delay: 30 })
  await page.keyboard.press('Enter')

  // ── save: no writable handle on this host, so it degrades to a download ──
  const [download] = await Promise.all([
    page.waitForEvent('download', { timeout: 60_000 }),
    page.getByRole('button', { name: /保存|^Save$/ }).first().click(),
  ])
  const savedPath = join(test.info().outputDir, 'saved.xlsx')
  await download.saveAs(savedPath)

  // ── reopen the saved file through the same UI path ──
  const [chooser2] = await Promise.all([
    page.waitForEvent('filechooser'),
    page.getByRole('button', { name: /打开/ }).first().click(),
  ])
  await chooser2.setFiles(savedPath)
  await page.waitForFunction(() => document.body.textContent?.includes('Sheet1'), null, {
    timeout: 30_000,
  })
  await page.waitForTimeout(1_500)

  // ── the edit survived: A1 reads back through the reopened session ──
  // (the grid and formula bar are canvas; the session host's diagnostic API
  // gives the live sessionId, and the bridge's read is the data-layer truth)
  await clickA1(page)
  await expect(page.locator('[data-u-comp="defined-name"] input')).toHaveValue('A1')
  const a1Value = await page.evaluate(async () => {
    const w = window as unknown as {
      __genofficeSheetsSessionHost: { debugSessions: () => { sessionId: string; sheetIds: string[] }[] }
      desktopApi: {
        readWorkbookRange: (req: unknown) => Promise<{ cells: { row: number; column: number; value: unknown }[] }>
      }
    }
    const sessions = w.__genofficeSheetsSessionHost.debugSessions()
    const current = sessions[sessions.length - 1]!
    const range = await w.desktopApi.readWorkbookRange({
      sessionId: current.sessionId,
      sheetId: current.sheetIds[0],
      range: { startRow: 0, endRow: 0, startColumn: 0, endColumn: 0 },
    })
    const cell = range.cells.find((c) => c.row === 0 && c.column === 0)
    return cell ? cell.value : null
  })
  expect(a1Value).toBe('HelloWasm')
  expect(errors).toEqual([])
})
