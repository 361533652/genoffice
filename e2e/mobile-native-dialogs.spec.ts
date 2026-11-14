import { expect, test } from '@playwright/test'

/**
 * Native alert/confirm/prompt in a mobile WebView.
 *
 * The renderers use the browser's own dialogs in ~42 places. They are the one piece
 * of UI whose appearance is entirely the host's choice: desktop browsers render a
 * modal attached to the window, Android WebViews render a system sheet that blocks
 * the entire page, and some embedded hosts suppress them or replace them entirely.
 *
 * Two things matter for this port, and they are not the same:
 *
 *  - a confirm() that never resolves would freeze the app, and a confirm() that
 *    returns the wrong default would discard work;
 *  - a prompt() returning null is indistinguishable from a cancel, so any code that
 *    treats the two differently is broken on some hosts.
 *
 * This drives a dialog and checks the app survives it, rather than assuming the
 * behaviour is fine because no test ever opened one.
 */

const APPS = [
  { name: 'docs', port: 5199 },
  { name: 'sheets', port: 5201 },
  { name: 'slides', port: 5202 },
  { name: 'pdf', port: 5203 },
  { name: 'markdown', port: 5204 },
]

test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true })

for (const app of APPS) {
  test(`${app.name}: a native dialog does not wedge the app`, async ({ page }) => {
    await page.goto(`http://127.0.0.1:${app.port}/`, { waitUntil: 'load' })
    await page.waitForTimeout(3_000)

    let sawDialog = false
    // dismissing is the behaviour a phone user gets when they tap outside
    page.on('dialog', async (d) => {
      sawDialog = true
      await d.dismiss()
    })

    // The app's own dialogs fire from UI paths that are hard to reach on an empty
    // document, so trigger the same primitives directly. What is being checked is
    // that a dismissed dialog resolves and the page stays responsive — the failure
    // that hurts on a phone is a blocked main thread, not the wording.
    const outcome = await page.evaluate(async () => {
      const results: Record<string, unknown> = {}
      // confirm dismissed -> false; a frozen page would hang here
      const confirmed = await Promise.race([
        Promise.resolve(window.confirm('test confirm')),
        new Promise((r) => setTimeout(() => r('timeout'), 5_000)),
      ])
      results.confirm = confirmed
      const prompted = await Promise.race([
        Promise.resolve(window.prompt('test prompt')),
        new Promise((r) => setTimeout(() => r('timeout'), 5_000)),
      ])
      results.prompt = prompted
      return results
    })

    test.info().annotations.push({ type: 'dialogs', description: JSON.stringify(outcome) })

    // the page must not be wedged: neither call may hang
    expect(outcome.confirm, 'confirm resolved rather than blocking').not.toBe('timeout')
    expect(outcome.prompt, 'prompt resolved rather than blocking').not.toBe('timeout')
    // a dismissed confirm is false, and a dismissed prompt is null. Code that treats
    // null as "" would silently submit an empty value on this host.
    expect(outcome.confirm, 'dismissed confirm is false').toBe(false)
    expect(outcome.prompt, 'dismissed prompt is null').toBeNull()

    // and the app is still interactive afterwards
    const alive = await page.evaluate(() => document.body.innerText.trim().length)
    expect(alive, 'the UI is still rendered').toBeGreaterThan(4)
    expect(sawDialog, 'the dialogs actually reached the browser').toBe(true)
  })
}
