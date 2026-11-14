import { expect, test } from '@playwright/test'

/**
 * Guard the dark-mode check itself.
 *
 * e2e/mobile-dark-mode.spec.ts asserts that each app is dark and readable in dark
 * mode. A check like that is easy to write in a way that always passes: compare
 * the wrong elements, read a colour that is always black, forget that the
 * emulation never reached the page. Then it reports six healthy apps forever and
 * nobody notices.
 *
 * These tests inject the two defects the real check exists to catch and require
 * it to fail on them. If someone loosens the thresholds in the real spec, this
 * stays green while that one goes quietly meaningless — so the numbers used here
 * are the same ones, applied to a page painted by hand.
 */

test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, colorScheme: 'dark' })

/** Relative luminance of an "rgb(r, g, b)" colour string. */
function luminance(rgb: string): number {
  const m = /rgba?\(([^)]+)\)/.exec(rgb)
  if (!m) return NaN
  const [r, g, b] = m[1].split(',').map((v) => Number(v.trim()) / 255)
  const lin = (c: number) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4)
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b)
}

test('a white surface in dark mode is flagged', async ({ page }) => {
  await page.goto('http://127.0.0.1:5199/', { waitUntil: 'load' })
  await page.waitForTimeout(2_000)
  // the defect: a raw white left behind, exactly what the theme rules forbid
  await page.addStyleTag({ content: 'body { background: #ffffff !important; color: #111111 !important; }' })
  await page.waitForTimeout(200)

  const bg = await page.evaluate(() => getComputedStyle(document.body).backgroundColor)
  // the dark-mode spec requires luminance < 0.5; white must be above it
  expect(luminance(bg), 'a light background must not pass the dark check').toBeGreaterThanOrEqual(0.5)
})

test('dark ink on a dark page is flagged', async ({ page }) => {
  await page.goto('http://127.0.0.1:5199/', { waitUntil: 'load' })
  await page.waitForTimeout(2_000)
  await page.addStyleTag({ content: 'body { background: #1a1a1a !important; color: #222222 !important; }' })
  await page.waitForTimeout(200)

  const colours = await page.evaluate(() => {
    const cs = getComputedStyle(document.body)
    return { bg: cs.backgroundColor, fg: cs.color }
  })
  const bg = luminance(colours.bg)
  const fg = luminance(colours.fg)
  const ratio = (Math.max(bg, fg) + 0.05) / (Math.min(bg, fg) + 0.05)

  // the dark-mode spec requires > 3; this pairing must fall below it
  expect(ratio, 'unreadable text must not pass the contrast check').toBeLessThanOrEqual(3)
})
