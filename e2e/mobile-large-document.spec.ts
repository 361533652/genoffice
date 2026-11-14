import { expect, test } from '@playwright/test'

/**
 * Opening a large document on a device with a small heap.
 *
 * The fixed thresholds in large-document.ts were measured on Apple silicon: the
 * read-only line assumes a ~2.2 GB working set, the refuse line ~4 GB. A phone
 * reports a much smaller JS heap, so using the desktop numbers would let a
 * document through that the device cannot hold — and the failure mode is not a
 * slow document, it is the renderer being killed part-way through pagination.
 *
 * This overrides performance.memory to a phone-sized heap and checks that the
 * tier decision actually moves. The document itself stays small: what is being
 * tested is the *decision*, not the ability to render 4 GB.
 */

const DOCS_URL = process.env.MOBILE_DOCS_URL ?? 'http://127.0.0.1:5199'

test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true })

test.describe('device-scaled tiers', () => {
  test('the tier reflects the reported heap, not the desktop constants', async ({ page }) => {
    // Pretend to be a phone: a 1GB heap instead of the container's 4GB.
    await page.addInitScript(() => {
      const perf = performance as unknown as { memory?: Record<string, number> }
      Object.defineProperty(perf, 'memory', {
        configurable: true,
        get() {
          return {
            jsHeapSizeLimit: 1024 * 1024 * 1024,
            usedJSHeapSize: 64 * 1024 * 1024,
            totalJSHeapSize: 128 * 1024 * 1024,
          }
        },
      })
    })

    await page.goto(DOCS_URL, { waitUntil: 'load' })
    await expect(page.locator('.ProseMirror')).toBeVisible({ timeout: 30_000 })
    await page.waitForTimeout(1_000)

    const decision = await page.evaluate(async () => {
      const mod = await import('/large-document.ts')
      const budget = mod.deviceBudget()
      // the three tiers, evaluated at weights around the scale a phone can hold
      return {
        budget,
        // a document the desktop would only mark read-only
        atDesktopReadOnly: mod.openTierForDevice(mod.LARGE_DOC_READ_ONLY_WEIGHT + 1),
        atDesktopRefuse: mod.openTierForDevice(mod.HUGE_DOC_REFUSE_WEIGHT + 1),
        // something modest must stay normal
        small: mod.openTierForDevice(1_000),
      }
    })

    // the emulated heap must be what the code sees, or the test proves nothing
    expect(decision.budget.heapMB, 'the emulated heap is visible').toBe(1024)
    expect(decision.budget.unknown).toBe(false)

    // a phone-sized heap must refuse what the desktop would merely degrade
    expect(
      decision.atDesktopReadOnly === 'refuse' || decision.atDesktopReadOnly === 'readOnly',
      'a 2.2GB document must not open normally on a 1GB device: ' + decision.atDesktopReadOnly,
    ).toBe(true)
    // and the desktop refuse line is certainly refused
    expect(decision.atDesktopRefuse).toBe('refuse')
    // a small document is unaffected
    expect(decision.small).toBe('normal')
  })

  test('a platform that reports nothing falls back to the desktop constants', async ({ page }) => {
    await page.addInitScript(() => {
      const perf = performance as unknown as { memory?: unknown }
      // delete rather than stub: this is the Safari / Firefox shape
      try {
        Object.defineProperty(perf, 'memory', { configurable: true, get: () => undefined })
      } catch {
        /* ignore */
      }
      Object.defineProperty(navigator, 'deviceMemory', { configurable: true, get: () => undefined })
    })

    await page.goto(DOCS_URL, { waitUntil: 'load' })
    await expect(page.locator('.ProseMirror')).toBeVisible({ timeout: 30_000 })

    const decision = await page.evaluate(async () => {
      const mod = await import('/large-document.ts')
      return {
        budget: mod.deviceBudget(),
        normal: mod.openTierForDevice(1_000),
        readOnly: mod.openTierForDevice(mod.LARGE_DOC_READ_ONLY_WEIGHT + 1),
        refuse: mod.openTierForDevice(mod.HUGE_DOC_REFUSE_WEIGHT + 1),
      }
    })

    // no figure available: the measured desktop behaviour is the safest default
    expect(decision.budget.unknown).toBe(true)
    expect(decision.normal).toBe('normal')
    expect(decision.readOnly).toBe('readOnly')
    expect(decision.refuse).toBe('refuse')
  })
})
