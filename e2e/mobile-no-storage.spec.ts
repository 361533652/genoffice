import { expect, test } from '@playwright/test'

/**
 * Booting on a device that will not store anything.
 *
 * A phone reaches this state routinely: Safari private mode, a full quota, an
 * embedded WebView with storage disabled, a sandboxed frame. The property exists
 * and either reading or writing it throws.
 *
 * Before the fallback shim, the docs app rendered nothing at all: `#root` stayed
 * empty and the page was blank, because a preference write inside a React render
 * escaped as an uncaught error. That is the worst failure shape in this port — not
 * a missing feature, no UI at all, on a device whose storage is merely restricted.
 *
 * Two failure modes are covered because they are different code paths: a write
 * that raises QuotaExceededError, and a store that throws on any access at all.
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

/** Every access throws — a locked-down WebView or a sandboxed frame. */
const ALL_THROWS = () => {
  const boom = (): never => {
    throw new DOMException('storage disabled', 'SecurityError')
  }
  Object.defineProperty(window, 'localStorage', {
    configurable: true,
    get() {
      return { getItem: boom, setItem: boom, removeItem: boom, clear: boom, key: boom, length: 0 }
    },
  })
}

/** Reads work, writes fail — the full-quota case, which is the common one. */
const WRITES_THROW = () => {
  const real = window.localStorage
  Object.defineProperty(window, 'localStorage', {
    configurable: true,
    get() {
      return {
        getItem: (k: string) => real.getItem(k),
        setItem: () => {
          throw new DOMException('QuotaExceededError', 'QuotaExceededError')
        },
        removeItem: (k: string) => real.removeItem(k),
        clear: () => real.clear(),
        key: (i: number) => real.key(i),
        get length() {
          return real.length
        },
      }
    },
  })
}

for (const app of APPS) {
  for (const [label, inject] of [
    ['write throws (full quota)', WRITES_THROW],
    ['storage throws on every access', ALL_THROWS],
  ] as const) {
    test(`${app.name}: boots when ${label}`, async ({ page }) => {
      await page.addInitScript(inject)
      const errors: string[] = []
      page.on('pageerror', (e) => errors.push(String(e)))

      await page.goto(`http://127.0.0.1:${app.port}/`, { waitUntil: 'load' })
      await page.waitForTimeout(3_000)

      const state = await page.evaluate(() => ({
        text: document.body.innerText.trim().length,
        rootChildren: document.getElementById('root')?.children.length ?? 0,
        lang: document.documentElement.lang,
      }))

      // a blank page here is the defect this exists to prevent. The character
      // floor is low on purpose: the PDF viewer's correct empty state is the eight
      // characters of "没有要打开的文件", so anything higher reports a healthy
      // screen as broken. #root having children is the real signal.
      expect(state.rootChildren, 'nothing rendered into #root').toBeGreaterThan(0)
      expect(state.text, 'the UI rendered without storage').toBeGreaterThanOrEqual(4)
      expect(state.lang, 'a language was still applied').toMatch(/^[a-z]{2}/)

      // The html app renders a sandboxed preview iframe, and storage access from
      // inside that frame throws SecurityError regardless of the shim on the top
      // window. That is a property of the frame's isolation, not a boot failure,
      // so it is excluded — while every other kind of error still fails the test.
      const topLevelErrors = errors.filter(
        (e) => !/sandboxed and lacks the 'allow-same-origin' flag/.test(e),
      )
      expect(topLevelErrors, 'an unhandled storage error reached the page').toEqual([])
    })
  }
}
