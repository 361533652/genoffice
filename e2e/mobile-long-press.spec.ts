import { expect, test } from '@playwright/test'

/**
 * Long-press and the context menu, measured rather than assumed.
 *
 * The renderers handle contextmenu in ~159 places (sheets 79, slides 48, docs 23,
 * pdf 9), and in sheets that menu is how rows/columns/cells are inserted, deleted
 * and formatted - not optional chrome. A phone has no right click, so the only way
 * that code runs is if a long press produces a contextmenu event.
 *
 * Measured with a 900ms touch-and-hold through CDP: zero contextmenu events.
 * There is also no long-press gesture anywhere in the codebase (onTouchStart plus
 * a timer), so nothing synthesises one.
 *
 * What that means, stated carefully because the evidence has limits:
 *
 *  - In a plain Android Chrome page, a long press does fire contextmenu, so the
 *    website case is probably fine.
 *  - In an Android WebView the host decides, and by default it does not; a port
 *    that wraps the renderer in a WebView must enable it or provide its own gesture.
 *
 * This file records the measurement and asserts only what is certain: no gesture
 * code exists, and a synthetic long press does not reach the handlers here.
 */

test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true })

test('no long-press gesture exists to produce a context menu', async ({ page }) => {
  await page.goto('http://127.0.0.1:5201/', { waitUntil: 'load' })
  await page.waitForTimeout(3_000)

  await page.evaluate(() => {
    const w = window as unknown as { __ctx?: Array<{ x: number; y: number }> }
    w.__ctx = []
    document.addEventListener(
      'contextmenu',
      (e) => w.__ctx!.push({ x: Math.round(e.clientX ?? -1), y: Math.round(e.clientY ?? -1) }),
      true,
    )
  })

  const cdp = await page.context().newCDPSession(page)
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: 190, y: 420 }] })
  await page.waitForTimeout(900)
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
  await page.waitForTimeout(600)

  const events = await page.evaluate(
    () => (window as unknown as { __ctx?: Array<{ x: number; y: number }> }).__ctx ?? [],
  )

  test.info().annotations.push({
    type: 'long-press',
    description: events.length + ' contextmenu events from a 900ms hold',
  })

  // The durable finding: nothing in this codebase turns a hold into a menu, so the
  // ~159 contextmenu handlers depend entirely on the host firing the event.
  expect(
    events.length,
    'a synthetic hold produced ' + events.length + ' contextmenu events; if this is no longer 0 ' +
      'the measurement above is stale and the ADR note should be revisited',
  ).toBe(0)
})
