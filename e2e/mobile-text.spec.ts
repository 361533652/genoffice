import { expect, test, type Page } from '@playwright/test'

/**
 * Opening a text document on a mobile host — markdown and html.
 *
 * These two apps read a file whole (`readFile(path) -> text`) instead of in
 * chunks, and they load it during mount, before any user interaction. That
 * makes them the pair most sensitive to boot ordering: the bridge must be
 * complete the moment the renderer first touches it.
 *
 * The bridge is stubbed by intercepting the global the shim installs, which is
 * how a real host would supply its own implementation. Stubbing from inside the
 * page after load is too late — the mount effect has already run.
 */

const MARKDOWN_URL = process.env.MOBILE_MARKDOWN_URL ?? 'http://127.0.0.1:5204'
const HTML_URL = process.env.MOBILE_HTML_URL ?? 'http://127.0.0.1:5205'

/**
 * Install a bridge stub for `globalName` before any app script runs.
 *
 * `defineProperty` with a setter is the only reliable hook: the shim assigns the
 * global during module evaluation, and a `setInterval` poller loses the race
 * against the mount effect that calls `consumePending`.
 */
async function stubBridge(page: Page, globalName: string, text: string): Promise<void> {
  await page.addInitScript(
    ({ globalName, text }) => {
      const host = window as unknown as Record<string, unknown>
      let real: Record<string, unknown> | undefined
      Object.defineProperty(host, globalName, {
        configurable: true,
        get() {
          return real
        },
        set(value: Record<string, unknown>) {
          real = new Proxy(value, {
            get(target, prop: string) {
              if (prop === 'consumePending') return async () => 'test-handle'
              if (prop === 'readFile') return async () => text
              if (prop === 'getPreviewInfo') return async () => ({ url: 'about:blank' })
              if (prop === 'updatePreview') return async () => undefined
              return target[prop]
            },
          })
        },
      })
    },
    { globalName, text },
  )
}

test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true })

test.describe('opening a text document on a mobile host', () => {
  test('markdown loads its file into the editor', async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', (e) => errors.push(String(e)))
    await stubBridge(page, 'markdownApi', '# 第一章\n\n这是正文段落。')

    await page.goto(MARKDOWN_URL, { waitUntil: 'load' })
    // the editor mounts before the file arrives, but the app hides `.app-main`
    // until status is 'ready'; wait on the content, not on the container
    const body = page.locator('[contenteditable=true]')
    await expect(body).toContainText('第一章', { timeout: 30_000 })
    await expect(body).toContainText('这是正文段落')
    expect(errors).toEqual([])
  })

  test('html loads its file into the source', async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', (e) => errors.push(String(e)))
    await stubBridge(page, 'htmlApi', '<!doctype html><html><body><h1>测试页面</h1></body></html>')

    await page.goto(HTML_URL, { waitUntil: 'load' })
    await expect(page.locator('body')).toBeVisible({ timeout: 30_000 })
    await page.waitForTimeout(2_500)

    // the app's status bar reports the document size once a file is loaded;
    // 0 字符 means the file never arrived
    await expect(page.getByText('0 字符')).toHaveCount(0)
    expect(errors).toEqual([])
  })
})

test.describe('markdown reading layout on a phone', () => {
  test('the page keeps a phone gutter instead of a 72px desktop margin', async ({ page }) => {
    // a '.md' id opens in the rich (rendered) mode; a bare token counts as plain
    // text and lands in the source pane, where .doc-page does not exist
    await page.addInitScript(() => {
      const host = window as unknown as Record<string, unknown>
      let real: Record<string, unknown> | undefined
      Object.defineProperty(host, 'markdownApi', {
        configurable: true,
        get() {
          return real
        },
        set(value: Record<string, unknown>) {
          real = new Proxy(value, {
            get(target, prop: string) {
              if (prop === 'consumePending') return async () => 'host/browser-1/sample.md'
              if (prop === 'readFile')
                return async () => '# 标题\n\n正文段落，包含 English words 和数字 123。'
              if (prop === 'getPreviewInfo') return async () => ({ url: 'about:blank' })
              if (prop === 'updatePreview') return async () => undefined
              return target[prop]
            },
          })
        },
      })
    })
    await page.goto(MARKDOWN_URL, { waitUntil: 'load' })
    await expect(page.locator('.doc-page')).toBeVisible({ timeout: 30_000 })
    const metrics = await page.evaluate(() => {
      const el = document.querySelector('.doc-page') as HTMLElement
      const cs = getComputedStyle(el)
      const r = el.getBoundingClientRect()
      return {
        padLeft: parseFloat(cs.paddingLeft),
        padRight: parseFloat(cs.paddingRight),
        column: Math.round(r.width - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight)),
      }
    })
    // the desktop 72px pair left ~246px of text on a 390px phone
    expect(metrics.padLeft, 'left gutter').toBeLessThanOrEqual(20)
    expect(metrics.padRight, 'right gutter').toBeLessThanOrEqual(20)
    expect(metrics.column, 'readable text column').toBeGreaterThan(300)
  })

  test('a SAF handle id shows the file name, not the percent-encoded URI', async ({ page }) => {
    await stubBridge(page, 'markdownApi', '# 文件名')
    // the host hands over a content:// id whose path is percent-encoded
    await page.addInitScript(() => {
      const host = window as unknown as Record<string, unknown>
      let real: Record<string, unknown> | undefined
      Object.defineProperty(host, 'markdownApi', {
        configurable: true,
        get() {
          return real
        },
        set(value: Record<string, unknown>) {
          real = new Proxy(value, {
            get(target, prop: string) {
              if (prop === 'consumePending')
                return async () =>
                  'content://com.android.externalstorage.documents/document/primary%3ADownload%2Fsample.md'
              if (prop === 'readFile') return async () => '# 文件名'
              if (prop === 'getPreviewInfo') return async () => ({ url: 'about:blank' })
              if (prop === 'updatePreview') return async () => undefined
              return target[prop]
            },
          })
        },
      })
    })
    await page.goto(MARKDOWN_URL, { waitUntil: 'load' })
    await expect(page.locator('.status-bar')).toContainText('sample.md', { timeout: 30_000 })
    await expect(page.locator('.status-bar')).not.toContainText('%3A')
  })
})
