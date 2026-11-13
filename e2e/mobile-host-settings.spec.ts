import { expect, test } from '@playwright/test'

/**
 * Every renderer reads its language, theme and document theme through the host
 * facade, not a global.
 *
 * This is the first group of the host-contract migration to actually land: the
 * five app entries used to call `window.desktopApi.getLanguage()` and friends
 * directly, each with its own `.catch(() => 'zh')`. On a host with no preload
 * those calls throw before the fallback can help (the object itself is
 * undefined), and each app had invented the same three lines independently.
 *
 * The test asserts the observable outcome — a language and theme land on the
 * document element — and that no page error was raised, which is what a
 * regression to direct global reads would break.
 */

const APPS = [
  { name: 'docs', port: 5199 },
  { name: 'sheets', port: 5201 },
  { name: 'slides', port: 5202 },
  { name: 'pdf', port: 5203 },
  { name: 'markdown', port: 5204 },
  { name: 'html', port: 5205 },
]

test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true })

for (const app of APPS) {
  test(`${app.name} resolves settings through the host facade`, async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', (e) => errors.push(String(e)))

    await page.goto(`http://127.0.0.1:${app.port}/`, { waitUntil: 'load' })
    await page.waitForTimeout(2_500)

    const settings = await page.evaluate(() => ({
      lang: document.documentElement.lang,
      dir: document.documentElement.dir,
      theme: document.documentElement.getAttribute('data-theme'),
    }))

    // htmlLang() renders the bare code as a BCP-47 tag: 'zh' -> 'zh-CN'
    expect(settings.lang, 'document language').toMatch(/^[a-z]{2}(-[A-Z]{2})?$/)
    expect(['ltr', 'rtl']).toContain(settings.dir)
    // absent means "system", which is the default both hosts answer
    expect([null, 'light', 'dark']).toContain(settings.theme)
    expect(errors, 'a global read would throw without a preload').toEqual([])
  })
}
