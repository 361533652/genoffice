import { expect, test, type Page } from '@playwright/test'

/**
 * Right-to-left layout on a phone.
 *
 * Every spec runs in Chinese, which is left-to-right. The suite ships 16
 * languages and two are RTL, where the chrome mirrors: the ribbon flows right to
 * left, side panes swap sides, and a layout written with `left`/`margin-left`
 * instead of logical properties overlaps itself. At 390px there is no room for
 * that mistake to hide.
 *
 * Arabic is used because it is the RTL locale with the most translated content,
 * which also stresses glyph shaping.
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

/**
 * Seed the stored language before the app boots.
 *
 * Only the top-level document is seeded. An init script also runs inside the
 * html app's sandboxed preview iframe, where localStorage throws SecurityError —
 * a real hazard for any storage access from a frame, and one this guard avoids
 * rather than papering over.
 */
async function useLanguage(page: Page, lang: string): Promise<void> {
  await page.addInitScript((language) => {
    // in a sandboxed frame there is no storage; skip rather than throw
    let storage: Storage
    try {
      storage = window.localStorage
      storage.getItem('__probe__')
    } catch {
      return
    }
    const key = 'genoffice.settings'
    let current: Record<string, unknown> = {}
    try {
      current = JSON.parse(storage.getItem(key) ?? '{}') as Record<string, unknown>
    } catch {
      current = {}
    }
    storage.setItem(key, JSON.stringify({ ...current, language }))
  }, lang)
}

for (const app of APPS) {
  test(`${app.name}: an RTL language mirrors the layout without breaking it`, async ({ page }) => {
    await useLanguage(page, 'ar')
    const errors: string[] = []
    page.on('pageerror', (e) => errors.push(String(e)))

    await page.goto(`http://127.0.0.1:${app.port}/`, { waitUntil: 'load' })
    await page.waitForTimeout(3_000)

    const state = await page.evaluate(() => ({
      dir: document.documentElement.dir,
      lang: document.documentElement.lang,
      innerWidth: window.innerWidth,
      scrollWidth: document.documentElement.scrollWidth,
      text: document.body.innerText,
    }))

    // the host must actually switch language, or the test proves nothing
    expect(state.lang, 'the app did not adopt the Arabic language').toMatch(/^ar/)
    expect(state.dir, 'the document is not right-to-left').toBe('rtl')

    // RTL is not an excuse for horizontal overflow at 390px
    expect(state.innerWidth).toBe(390)
    expect(state.scrollWidth, 'RTL layout overflows the viewport').toBeLessThanOrEqual(390)

    // the UI is rendered in Arabic script, not left in Chinese with a dir flip.
    // The threshold is small on purpose: the PDF viewer's empty state is a short
    // sentence, and demanding more text than that reported a healthy screen as
    // broken.
    expect(/[\u0600-\u06FF]/.test(state.text), 'no Arabic glyphs rendered').toBe(true)
    expect(/[\u4E00-\u9FFF]/.test(state.text), 'Chinese text survived the switch').toBe(false)
    expect(errors).toEqual([])
  })
}
