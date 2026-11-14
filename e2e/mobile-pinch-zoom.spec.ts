import { expect, test } from '@playwright/test'

/**
 * Two-finger pinch on the page, and what happens on a canvas app.
 *
 * A phone user pinches to make things readable; nothing in the viewports disables it
 * (no user-scalable=no), so page zoom is the baseline.
 *
 * Measured with a CDP pinch across four apps:
 *
 *   docs, markdown   visualViewport.scale -> 4.334   page zoom works
 *   sheets, slides   visualViewport.scale -> 1       page zoom does not happen
 *
 * The cause is not a preventDefault. No touchmove was cancelled in any app, and the
 * touchstart log shows the gesture arriving normally. It is the canvas: Univer's
 * canvas carries touch-action: none as its own attribute (its ancestors are all
 * auto), which tells the browser to stop interpreting gestures over that area.
 *
 * That is a defensible choice for a grid that pans and zooms itself — but only if the
 * app provides another way in. It does: sheets ships its own zoom control (10%-400%),
 * verified present with an accessible name. So this is not a defect; it is a
 * behaviour worth pinning so nobody removes the control believing the browser covers it.
 */

const APPS = [
  { name: 'docs', port: 5199, pageZooms: true },
  { name: 'markdown', port: 5204, pageZooms: true },
  { name: 'sheets', port: 5201, pageZooms: false },
  { name: 'slides', port: 5202, pageZooms: false },
]

test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true })

for (const app of APPS) {
  test(`${app.name}: pinch behaviour matches the app's own zoom story`, async ({ page }) => {
    await page.goto(`http://127.0.0.1:${app.port}/`, { waitUntil: 'load' })
    await page.waitForTimeout(3_000)

    // nothing should be cancelling touchmove: a swallowed gesture would be a defect
    // regardless of which app it happens in
    await page.evaluate(() => {
      const w = window as unknown as { __prevented: number }
      w.__prevented = 0
      document.addEventListener(
        'touchmove',
        (e) => {
          if (e.defaultPrevented) w.__prevented++
        },
        { capture: true, passive: true },
      )
    })

    const cdp = await page.context().newCDPSession(page)
    const cx = 195
    const cy = 420
    await cdp.send('Input.dispatchTouchEvent', {
      type: 'touchStart',
      touchPoints: [
        { x: cx - 25, y: cy, id: 1 },
        { x: cx + 25, y: cy, id: 2 },
      ],
    })
    for (let i = 1; i <= 8; i++) {
      await cdp.send('Input.dispatchTouchEvent', {
        type: 'touchMove',
        touchPoints: [
          { x: cx - 25 - i * 10, y: cy, id: 1 },
          { x: cx + 25 + i * 10, y: cy, id: 2 },
        ],
      })
      await page.waitForTimeout(30)
    }
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
    await page.waitForTimeout(600)

    const state = await page.evaluate(() => {
      const vv = window.visualViewport
      const slider = document.querySelector('.zoom-slider') as HTMLInputElement | null
      return {
        prevented: (window as unknown as { __prevented: number }).__prevented,
        scale: vv ? Number(vv.scale.toFixed(2)) : null,
        ownZoom: slider
          ? { min: slider.min, max: slider.max, visible: slider.getBoundingClientRect().width > 0 }
          : null,
        alive: document.body.innerText.trim().length,
      }
    })

    test.info().annotations.push({ type: 'pinch', description: JSON.stringify(state) })

    // a cancelled touchmove is a real defect in any app
    expect(state.prevented, 'no touchmove was cancelled').toBe(0)
    expect(state.alive, 'the app survives the gesture').toBeGreaterThan(4)

    if (app.pageZooms) {
      expect(state.scale, 'page zoom engaged on a normal DOM app').toBeGreaterThan(1)
    } else {
      // the canvas consumes the gesture; the app must therefore offer its own control
      expect(state.scale, 'a canvas app does not page-zoom').toBe(1)
      expect(state.ownZoom, 'so it must ship its own zoom').not.toBeNull()
      expect(state.ownZoom!.visible, 'and that control must be visible').toBe(true)
    }
  })
}
