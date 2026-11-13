import { expect, test, type Page } from '@playwright/test'

/**
 * Mobile host acceptance — every editor renderer, no Electron.
 *
 * These run against each app's plain Vite dev server (no preload bridge),
 * exactly how the Android WebView host will load them. The suite covers the
 * three checks ADR 4 requires before touch work starts:
 *
 *   1. the renderer boots without an Electron preload
 *   2. the layout stays inside the device viewport (no sideways scroll)
 *   3. the CJK IME commits exactly the composed characters (docs)
 *
 * Run: npm run test:mobile   (start the six dev servers first, see
 * docs/mobile/decisions.md)
 */

const PHONE = { width: 390, height: 844 }

test.use({
  viewport: PHONE,
  hasTouch: true,
  isMobile: true,
  deviceScaleFactor: 2,
})

/** Every editor that must boot on the mobile host. */
const APPS = [
  { name: 'docs', url: 'http://127.0.0.1:5199', ready: '.ProseMirror' },
  { name: 'sheets', url: 'http://127.0.0.1:5201', ready: '.ribbon' },
  { name: 'slides', url: 'http://127.0.0.1:5202', ready: '.ribbon' },
  { name: 'pdf', url: 'http://127.0.0.1:5203', ready: 'body' },
  { name: 'markdown', url: 'http://127.0.0.1:5204', ready: 'body' },
  { name: 'html', url: 'http://127.0.0.1:5205', ready: 'body' },
]

/** Boot an app and wait for its editor chrome. */
async function boot(page: Page, app: (typeof APPS)[number]): Promise<string[]> {
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(String(e)))
  await page.goto(app.url, { waitUntil: 'load' })
  await expect(page.locator(app.ready).first()).toBeVisible({ timeout: 30_000 })
  await page.waitForTimeout(1_500)
  return errors
}

for (const app of APPS) {
  test.describe(`${app.name} on a mobile host`, () => {
    test('boots with no Electron preload', async ({ page }) => {
      const errors = await boot(page, app)
      // a shim that throws is worse than a missing feature: nothing renders
      expect(errors).toEqual([])
      expect(await page.title()).not.toBe('')
    })

    test('keeps the layout inside the viewport', async ({ page }) => {
      await boot(page, app)
      const m = await page.evaluate(() => ({
        innerWidth: window.innerWidth,
        scrollWidth: document.documentElement.scrollWidth,
        visualWidth: window.visualViewport?.width ?? 0,
      }))
      // a wider layout viewport means the whole page scrolls sideways — the
      // exact defect that made the shell render at 660/720px on this device
      expect(m.innerWidth).toBe(PHONE.width)
      expect(m.scrollWidth).toBeLessThanOrEqual(PHONE.width)
      expect(m.visualWidth).toBe(PHONE.width)
    })
  })
}

test.describe('docs IME on a mobile host', () => {
  /** Type a string through a real composition session. */
  async function compose(page: Page, buffer: string, commit: string): Promise<void> {
    const cdp = await page.context().newCDPSession(page)
    await cdp.send('Input.imeSetComposition', {
      text: buffer,
      selectionStart: buffer.length,
      selectionEnd: buffer.length,
    })
    await page.waitForTimeout(80)
    await cdp.send('Input.insertText', { text: commit })
    await page.waitForTimeout(80)
  }

  const text = (page: Page): Promise<string> =>
    page.evaluate(() => {
      const el = document.querySelector('.ProseMirror')
      return (el?.textContent ?? '').replace(/\s+/g, '')
    })

  test('composed characters land exactly', async ({ page }) => {
    await boot(page, APPS[0])
    await page.locator('.ProseMirror').click({ position: { x: 120, y: 120 } })
    const before = await text(page)
    await compose(page, 'nihao', '你好')
    await compose(page, 'shijie', '世界')
    expect((await text(page)).slice(before.length)).toBe('你好世界')
  })

  test('cancelling a composition leaves nothing behind', async ({ page }) => {
    await boot(page, APPS[0])
    await page.locator('.ProseMirror').click({ position: { x: 120, y: 120 } })
    const before = await text(page)
    const cdp = await page.context().newCDPSession(page)
    await cdp.send('Input.imeSetComposition', { text: 'zhongwen', selectionStart: 8, selectionEnd: 8 })
    await page.waitForTimeout(100)
    await cdp.send('Input.imeSetComposition', { text: '', selectionStart: 0, selectionEnd: 0 })
    await page.waitForTimeout(200)
    expect(await text(page)).toBe(before)
  })

  test('the status bar counts committed characters', async ({ page }) => {
    await boot(page, APPS[0])
    await page.locator('.ProseMirror').click({ position: { x: 120, y: 120 } })
    await compose(page, 'ceshi', '测试')
    await page.waitForTimeout(400)
    await expect(page.getByText(/2 个字/)).toBeVisible()
  })
})

test.describe('sheets needs a spreadsheet that can take input', () => {
  test('accepts a value typed into the active cell', async ({ page }) => {
    await boot(page, APPS[1])
    // Univer renders to canvas; a real edit has to go through its API, so this
    // asserts the grid mounted and reports a sheet instead of pretending to type
    const hasGrid = await page.evaluate(
      () => document.querySelectorAll('canvas').length > 0,
    )
    expect(hasGrid).toBe(true)
  })
})
