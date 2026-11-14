import { expect, test } from '@playwright/test'

/**
 * Guard the IME composition check.
 *
 * The real spec asserts that committed text contains the Chinese characters and no
 * pinyin. Both halves need to be able to fail, or a build that simply echoes
 * composition text would pass:
 *
 *  - plain text typed into the editor must NOT be reported as containing 你好 —
 *    so the "composition is committed" assertion is not vacuous;
 *  - the pinyin check must actually catch pinyin, proven by inserting it.
 */

const DOCS_URL = process.env.MOBILE_DOCS_URL ?? 'http://127.0.0.1:5199'

test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true })

test('the pinyin assertion catches pinyin when it is present', async ({ page }) => {
  await page.goto(DOCS_URL, { waitUntil: 'load' })
  await expect(page.locator('.ProseMirror')).toBeVisible({ timeout: 30_000 })
  await page.locator('.ProseMirror').click()
  await page.waitForTimeout(300)

  // the defect the real test looks for, written by hand
  await page.keyboard.type('nihao shijie')
  await page.waitForTimeout(400)
  const text = await page.evaluate(() => document.querySelector('.ProseMirror')?.textContent ?? '')

  expect(text.toLowerCase(), 'the editor holds pinyin').toContain('nihao')
  // and the real test's assertion would now fail, which is the point
  expect(text.toLowerCase().includes('nihao'), 'the check would report a leak').toBe(true)
})

test('plain typing does not satisfy the Chinese-character assertion', async ({ page }) => {
  await page.goto(DOCS_URL, { waitUntil: 'load' })
  await expect(page.locator('.ProseMirror')).toBeVisible({ timeout: 30_000 })
  await page.locator('.ProseMirror').click()
  await page.waitForTimeout(300)

  await page.keyboard.type('hello world')
  await page.waitForTimeout(400)
  const text = await page.evaluate(() => document.querySelector('.ProseMirror')?.textContent ?? '')

  // the real spec requires 你好世界 to be present; latin text must not fake that
  expect(text, 'latin text must not satisfy the CJK assertion').not.toContain('你好')
  expect(text.length, 'something was typed').toBeGreaterThan(5)
})
