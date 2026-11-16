import { expect, test } from '@playwright/test'

/**
 * Mobile chrome auto-collapse.
 *
 * The user's rule: while reading (dragging/scrolling/pinching) the ribbon and
 * status bar get out of the way; ONLY a genuine tap brings them back. Before
 * this the ribbon simply sat there like a desktop window's — the "PC projection"
 * complaint. A drag must not count as a tap, and a multi-finger gesture must not
 * either.
 *
 * Touch events go through CDP because the recognizer listens for pointerType
 * 'touch'; a mouse click is deliberately ignored by design (it is a desktop
 * input, and desktop keeps its chrome).
 */

const DOCS_URL = process.env.MOBILE_DOCS_URL ?? 'http://127.0.0.1:5199'

test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true })

async function touchDrag(cdp: any, from: { x: number; y: number }, to: { x: number; y: number }): Promise<void> {
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: from.x, y: from.y }] })
  for (let i = 1; i <= 4; i++) {
    const x = from.x + ((to.x - from.x) * i) / 4
    const y = from.y + ((to.y - from.y) * i) / 4
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x, y }] })
  }
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
}

async function touchTap(cdp: any, at: { x: number; y: number }): Promise<void> {
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: at.x, y: at.y }] })
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
}

test.describe('mobile chrome', () => {
  test('a drag hides the ribbon and a tap brings it back', async ({ page }) => {
    await page.goto(DOCS_URL, { waitUntil: 'load' })
    await expect(page.locator('.ProseMirror')).toBeVisible({ timeout: 30_000 })
    await page.waitForTimeout(600)

    // a phone starts with the command band CLOSED (the "only common tools, open
    // the rest when I want it" half of the ask); the tab row stays reachable
    // the band body is what collapses (docs wraps the tab row and the band in
    // .ribbon; sheets keeps them as siblings), so assert the body, not .ribbon
    await expect(page.locator('[data-ribbon-body]')).toBeHidden()
    await expect(page.locator('.ribbon-tabs')).toBeVisible()

    const cdp = await page.context().newCDPSession(page)

    // reading gesture: drag up through the page content
    await touchDrag(cdp, { x: 195, y: 520 }, { x: 195, y: 300 })
    // collapse fires after the gesture settles, not during it
    await expect(page.locator('html')).toHaveAttribute('data-mobile-chrome', 'hidden', { timeout: 5_000 })
    await expect(page.locator('.ribbon-tabs')).toBeHidden()

    // a drag must NOT be mistaken for a tap
    await touchDrag(cdp, { x: 195, y: 500 }, { x: 195, y: 320 })
    await page.waitForTimeout(400)
    await expect(page.locator('html')).toHaveAttribute('data-mobile-chrome', 'hidden')

    // a genuine tap brings the chrome back — and the band with it
    await touchTap(cdp, { x: 195, y: 420 })
    await expect(page.locator('html')).toHaveAttribute('data-mobile-chrome', 'shown', { timeout: 5_000 })
    await expect(page.locator('.ribbon-tabs')).toBeVisible()
    await expect(page.locator('[data-ribbon-body]'), 'the tap also reveals the band').toBeVisible()
  })

  test('the status readout no longer slices a glyph in half', async ({ page }) => {
    await page.goto(DOCS_URL, { waitUntil: 'load' })
    await expect(page.locator('.ProseMirror')).toBeVisible({ timeout: 30_000 })
    await page.waitForTimeout(600)

    // the desktop row packed page + word count + track changes + message into
    // 360px; each cell was clipped through the last glyph ("第 1 什"), which the
    // user read as mojibake. Narrow layout ellipsizes at a glyph boundary and
    // drops the track toggle.
    const layout = await page.evaluate(() => {
      const left = document.querySelector('.status-left') as HTMLElement | null
      const track = document.querySelector('.status-left .status-track') as HTMLElement | null
      const msg = document.querySelector('.status-left .status-msg') as HTMLElement | null
      const r = left?.getBoundingClientRect()
      return {
        leftWidth: r ? Math.round(r.width) : 0,
        leftOverflow: left ? left.scrollWidth > left.clientWidth + 1 : null,
        trackShown: track ? getComputedStyle(track).display !== 'none' : null,
        msgTextOverflow: msg ? getComputedStyle(msg).textOverflow : null,
      }
    })
    // the readout gets the leftover width instead of being squeezed to 78px
    expect(layout.leftWidth).toBeGreaterThan(120)
    expect(layout.trackShown).toBe(false)
    expect(layout.msgTextOverflow).toBe('ellipsis')
  })
  test('a pinch is not a reading scroll: the chrome stays put', async ({ page }) => {
    await page.goto(DOCS_URL, { waitUntil: 'load' })
    await expect(page.locator('.ProseMirror')).toBeVisible({ timeout: 30_000 })
    await page.waitForTimeout(800)

    const cdp = await page.context().newCDPSession(page)
    const cx = 195
    const cy = 420
    await cdp.send('Input.dispatchTouchEvent', {
      type: 'touchStart',
      touchPoints: [{ x: cx - 25, y: cy, id: 1 }, { x: cx + 25, y: cy, id: 2 }],
    })
    for (let i = 1; i <= 6; i++) {
      await cdp.send('Input.dispatchTouchEvent', {
        type: 'touchMove',
        touchPoints: [{ x: cx - 25 - i * 10, y: cy, id: 1 }, { x: cx + 25 + i * 10, y: cy, id: 2 }],
      })
      await page.waitForTimeout(30)
    }
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
    await page.waitForTimeout(600)

    // the status bar holds the zoom readout the pinch is driving; collapsing it
    // mid-pinch removed the only feedback (and broke mobile-pinch-zoom)
    await expect(page.locator('html')).not.toHaveAttribute('data-mobile-chrome', 'hidden')
    await expect(page.locator('.status-bar')).toBeVisible()
  })
})
