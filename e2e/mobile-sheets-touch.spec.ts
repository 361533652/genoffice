import { expect, test } from '@playwright/test'
import { createHash } from 'node:crypto'

/**
 * One-finger scrolling on the Univer grid.
 *
 * There is no wheel on a phone, and Univer reads a one-finger drag as a RANGE
 * SELECTION: measured before this, a vertical drag left B19:B27 selected and the
 * viewport did not move — the only way to scroll was the thin scrollbar, which is
 * exactly what the user complained about.
 *
 * The grid is canvas, so neither innerText nor DOM scrollTop can answer "did it
 * scroll". Two independent signals are used instead: the defined-name box (a
 * drag would leave a range like B19:B27; a scroll must leave one cell) and a
 * pixel hash of the grid area (content actually moved).
 */

const SHEETS_URL = process.env.MOBILE_SHEETS_URL ?? 'http://127.0.0.1:5201'

test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true })

async function gridClip(page: import('@playwright/test').Page): Promise<{ x: number; y: number; width: number; height: number; scale: number }> {
  return page.evaluate(() => {
    const canvas = [...document.querySelectorAll('canvas')].find((c) => c.getBoundingClientRect().width > 300)!
    const r = canvas.getBoundingClientRect()
    return { x: Math.round(r.x) + 60, y: Math.round(r.y) + 90, width: 140, height: 140, scale: 1 }
  })
}

async function gridHash(cdp: any, page: import('@playwright/test').Page): Promise<string> {
  const clip = await gridClip(page)
  const shot: any = await cdp.send('Page.captureScreenshot', { format: 'png', clip })
  return createHash('sha1').update(shot.data).digest('hex').slice(0, 12)
}

const definedName = (page: import('@playwright/test').Page) =>
  page.locator('[data-u-comp="defined-name"] input')

test.describe('grid touch gestures', () => {
  test('a one-finger drag scrolls instead of selecting a range', async ({ page }) => {
    test.setTimeout(120_000)
    await page.goto(SHEETS_URL, { waitUntil: 'load' })
    await expect(page.locator('.ribbon-tabs')).toBeVisible({ timeout: 30_000 })
    await page.waitForTimeout(3_000)
    await expect(definedName(page)).toHaveValue('A1')

    const cdp = await page.context().newCDPSession(page)
    const before = await gridHash(cdp, page)

    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: 195, y: 600 }] })
    for (let i = 1; i <= 10; i++) {
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: 195, y: 600 - i * 20 }] })
      await page.waitForTimeout(25)
    }
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
    await page.waitForTimeout(700)

    // the content moved: the grid scrolled
    const after = await gridHash(cdp, page)
    expect(after, 'the grid scrolled: the rendered cells changed').not.toBe(before)

    // and it is a scroll, not a drag: the selection is ONE cell
    const name = await definedName(page).inputValue()
    expect(name, 'a scroll must not leave a range selected').not.toContain(':')
    expect(name).toMatch(/^[A-Z]+\d+$/)

    // the chrome collapsed as it would for any reading gesture — including the
    // QAT/tab strip, which on sheets is a sibling of .ribbon, not inside it
    await expect(page.locator('html')).toHaveAttribute('data-mobile-chrome', 'hidden')
    await expect(page.locator('.ribbon-tabs')).toBeHidden()
  })

  test('a two-finger pinch zooms and leaves one cell selected', async ({ page }) => {
    test.setTimeout(120_000)
    await page.goto(SHEETS_URL, { waitUntil: 'load' })
    await expect(page.locator('.ribbon-tabs')).toBeVisible({ timeout: 30_000 })
    await page.waitForTimeout(3_000)

    const zoomValue = page.locator('.zoom-value')
    const before = await zoomValue.innerText()

    const cdp = await page.context().newCDPSession(page)
    await cdp.send('Input.dispatchTouchEvent', {
      type: 'touchStart',
      touchPoints: [{ x: 170, y: 420, id: 1 }, { x: 220, y: 420, id: 2 }],
    })
    for (let i = 1; i <= 8; i++) {
      await cdp.send('Input.dispatchTouchEvent', {
        type: 'touchMove',
        touchPoints: [{ x: 170 - i * 6, y: 420, id: 1 }, { x: 220 + i * 6, y: 420, id: 2 }],
      })
      await page.waitForTimeout(30)
    }
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
    await page.waitForTimeout(700)

    expect(await zoomValue.innerText(), 'pinching out zooms in').not.toBe(before)
    const name = await definedName(page).inputValue()
    expect(name, 'a pinch is not a range drag').not.toContain(':')
    // a pinch must not collapse the chrome (it would hide the zoom readout)
    await expect(page.locator('html')).not.toHaveAttribute('data-mobile-chrome', 'hidden')
  })
})
