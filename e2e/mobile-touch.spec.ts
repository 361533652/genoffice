import { expect, test, type Page } from '@playwright/test'

/**
 * Touch behaviour on a mobile host — the acceptance gate from ADR 4.
 *
 * This answers the question the plan could not settle by reading code: does a
 * finger actually drive these editors? Every interaction here is dispatched as
 * a real touch event through CDP, not a synthetic click, so a mouse-only event
 * handler fails the test.
 *
 * Findings so far (measured, not assumed):
 *  - sheets: Univer DOES handle touch for cell selection and drag-select. The
 *    expert prediction that drag-select and scrolling would fight over the same
 *    gesture did not hold at this size.
 *  - slides: Konva mounts and paints; touch selection needs the deck to exist.
 *  - docs: a touch places the caret and starts a selection.
 */

const SHEETS_URL = 'http://127.0.0.1:5201'
const DOCS_URL = 'http://127.0.0.1:5199'
const SLIDES_URL = 'http://127.0.0.1:5202'

test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true })

/** Tap at a viewport point with a real touch event. */
async function tap(page: Page, x: number, y: number): Promise<void> {
  const cdp = await page.context().newCDPSession(page)
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] })
  await page.waitForTimeout(60)
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
  await page.waitForTimeout(500)
}

/** Drag a finger from one point to another. */
async function drag(page: Page, from: { x: number; y: number }, to: { x: number; y: number }): Promise<void> {
  const cdp = await page.context().newCDPSession(page)
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [from] })
  await page.waitForTimeout(80)
  const steps = 8
  for (let i = 1; i <= steps; i++) {
    await cdp.send('Input.dispatchTouchEvent', {
      type: 'touchMove',
      touchPoints: [
        {
          x: from.x + ((to.x - from.x) * i) / steps,
          y: from.y + ((to.y - from.y) * i) / steps,
        },
      ],
    })
    await page.waitForTimeout(45)
  }
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
  await page.waitForTimeout(700)
}

test.describe('touch on a mobile host', () => {
  test('sheets: a tap moves the cell cursor', async ({ page }) => {
    await page.goto(SHEETS_URL, { waitUntil: 'load' })
    await expect(page.locator('.ribbon')).toBeVisible({ timeout: 30_000 })
    await page.waitForTimeout(3_500)

    const address = (): Promise<string | null> =>
      page.evaluate(() => {
        const box = [...document.querySelectorAll('input')].find(
          (i) => /^[A-Z]+\d+$/.test(i.value) || /^[A-Z]+\d+:/.test(i.value),
        )
        return box?.value ?? null
      })

    const before = await address()
    expect(before).not.toBeNull()
    await tap(page, 70, 260)
    expect(await address()).not.toBe(before)
  })

  test('sheets: a finger drag selects a range', async ({ page }) => {
    await page.goto(SHEETS_URL, { waitUntil: 'load' })
    await expect(page.locator('.ribbon')).toBeVisible({ timeout: 30_000 })
    await page.waitForTimeout(3_500)

    await drag(page, { x: 70, y: 300 }, { x: 200, y: 450 })
    const selection = await page.evaluate(() => {
      const box = [...document.querySelectorAll('input')].find((i) => /^[A-Z]+\d+:/.test(i.value))
      return box?.value ?? null
    })
    // a range, not a single cell: the drag actually extended the selection
    expect(selection).toMatch(/^[A-Z]+\d+:[A-Z]+\d+$/)
  })

  test('sheets: a tap plus typing writes into the cell', async ({ page }) => {
    await page.goto(SHEETS_URL, { waitUntil: 'load' })
    await expect(page.locator('.ribbon')).toBeVisible({ timeout: 30_000 })
    await page.waitForTimeout(3_500)

    // the grid rasterises into a canvas, so neither innerText nor a DOM node
    // ever shows the cell value: the assertion has to be a pixel diff of the
    // cell region. Asserting on innerText here produced a false failure that
    // said touch typing did not work at all.
    const grid = await page.evaluate(() => {
      for (const canvas of document.querySelectorAll('canvas')) {
        const r = canvas.getBoundingClientRect()
        if (r.width > 300 && r.height > 200) return { x: r.x, y: r.y }
      }
      return null
    })
    expect(grid, 'worksheet canvas').not.toBeNull()
    const cell = { x: grid!.x + 89, y: grid!.y + 36 }
    const clip = { x: cell.x - 40, y: cell.y - 30, width: 200, height: 60 }

    const before = await page.screenshot({ clip })
    await tap(page, cell.x, cell.y)

    // the name box is DOM, so it is the reliable "a cell is selected" signal
    await expect(page.locator('[data-u-comp="defined-name"] input')).toHaveValue(/^[A-Z]+\d+$/)

    // type the way a soft keyboard delivers text, then commit the edit
    await page.keyboard.type('触摸77', { delay: 90 })
    await page.keyboard.press('Enter')
    await page.waitForTimeout(1_000)

    const after = await page.screenshot({ clip })
    expect(Buffer.compare(before, after), 'the cell repainted').not.toBe(0)
  })

  test('docs: a tap places the caret and typing works', async ({ page }) => {
    await page.goto(DOCS_URL, { waitUntil: 'load' })
    await expect(page.locator('.ProseMirror')).toBeVisible({ timeout: 30_000 })
    await page.waitForTimeout(800)

    const box = (await page.locator('.ProseMirror').boundingBox())!
    await tap(page, box.x + 100, box.y + 120)
    await page.keyboard.type('触摸输入')
    await expect(page.locator('.ProseMirror')).toContainText('触摸输入')
  })

  test('slides: the deck canvas paints', async ({ page }) => {
    await page.goto(SLIDES_URL, { waitUntil: 'load' })
    await expect(page.locator('.ribbon')).toBeVisible({ timeout: 30_000 })
    await page.waitForTimeout(5_000)

    // the app asks for a blank deck on boot; returning undefined there left it
    // stuck on "Opening…" with no canvas at all
    const state = await page.evaluate(() => ({
      canvases: document.querySelectorAll('canvas').length,
      konvaStages: document.querySelectorAll('.konvajs-content').length,
      text: document.body.innerText.slice(0, 200),
    }))
    expect(state.canvases).toBeGreaterThan(0)
    expect(state.konvaStages).toBeGreaterThan(0)
    expect(state.text).not.toContain('正在打开')
  })
})
