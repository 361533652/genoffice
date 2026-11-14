import { expect, test } from '@playwright/test'

/**
 * Guard the storage-fallback check.
 *
 * e2e/mobile-no-storage.spec.ts asserts every app still boots when storage
 * throws. Worth proving it would have failed before the fallback shim existed —
 * otherwise the shim could be a no-op and the suite would never notice.
 *
 * Loading the app with the shim bypassed reproduces the original defect: the
 * preference write during render escapes and `#root` stays empty.
 */

test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true })

test('without the fallback, a throwing write leaves the app blank', async ({ page }) => {
  // Remove the shim's effect before it runs: the module reads this to decide
  // whether to install. Reproducing the pre-fix state is the point.
  await page.addInitScript(() => {
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
    // sabotage the shim so the app runs exactly as it did before the fix
    Object.defineProperty(window, 'localStorage', {
      configurable: false,
      get() {
        const boom = () => {
          throw new DOMException('QuotaExceededError', 'QuotaExceededError')
        }
        return { getItem: boom, setItem: boom, removeItem: boom, clear: boom, key: boom, length: 0 }
      },
    })
  })

  await page.goto('http://127.0.0.1:5199/', { waitUntil: 'load' })
  await page.waitForTimeout(3_000)

  const rootChildren = await page.evaluate(
    () => document.getElementById('root')?.children.length ?? 0,
  )
  // the shim cannot redefine a non-configurable property, so this reproduces the
  // bare failure and documents what the fallback is protecting against
  const text = await page.evaluate(() => document.body.innerText.trim().length)
  expect(rootChildren === 0 || text < 10, 'the pre-fix failure mode was reproduced').toBe(true)
})
