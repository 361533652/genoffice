import { expect, test } from '@playwright/test'

/**
 * Guard the RTL check.
 *
 * e2e/mobile-rtl.spec.ts asserts that each app mirrors for Arabic, stays inside
 * the viewport and actually renders Arabic glyphs. A check like that can pass for
 * the wrong reason: if the language never switches, the page is Chinese, `dir`
 * is ltr and the assertion fails — good. But if the *assertions* are wrong, a
 * left-to-right page can also pass. These two cases pin the failure direction.
 */

test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true })

test('a left-to-right page does not satisfy the RTL assertion', async ({ page }) => {
  await page.goto('http://127.0.0.1:5199/', { waitUntil: 'load' })
  await page.waitForTimeout(2_000)

  const state = await page.evaluate(() => ({
    dir: document.documentElement.dir,
    text: document.body.innerText,
  }))

  // no language seeding: the default app is Chinese and left-to-right
  expect(state.dir, 'the default shell must not claim RTL').not.toBe('rtl')
  expect(/[\u0600-\u06FF]/.test(state.text), 'default UI has no Arabic glyphs').toBe(false)
})

test('the Arabic glyph test distinguishes scripts', async ({ page }) => {
  await page.goto('http://127.0.0.1:5199/', { waitUntil: 'load' })
  await page.waitForTimeout(1_500)

  const scripts = await page.evaluate(() => ({
    chinese: /[\u4E00-\u9FFF]/.test(document.body.innerText),
    arabic: /[\u0600-\u06FF]/.test(document.body.innerText),
  }))
  // the two ranges must not overlap, or "rendered Arabic" would be true of any
  // Chinese screen and the RTL assertion would mean nothing
  expect(scripts.chinese, 'default UI is Chinese').toBe(true)
  expect(scripts.arabic, 'Chinese text must not count as Arabic').toBe(false)
})
