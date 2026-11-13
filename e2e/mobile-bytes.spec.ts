import { expect, test } from '@playwright/test'

/**
 * How the host hands document bytes to the renderer.
 *
 * `OpenFileResult.dataUrl` is fetched exactly once, so it can be a blob URL —
 * and it must be. The first implementation built a base64 data URL by
 * concatenating `String.fromCharCode` chunks. Measured on a 20MB document that
 * cost 682ms and produced a 27.9MB string (1.33x the input, with the decoded
 * copy transiently doubling it again); the blob route took 5.6ms and a
 * 63-character URL.
 *
 * On a phone that difference is the gap between opening a deck and being killed
 * for memory, so it is pinned here rather than left as an implementation note.
 */

const DOCS_URL = process.env.MOBILE_DOCS_URL ?? 'http://127.0.0.1:5199'

test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true })

test.describe('document byte transport', () => {
  test('a blob URL carries 20MB in constant size and near-constant time', async ({ page }) => {
    await page.goto(DOCS_URL, { waitUntil: 'load' })
    await expect(page.locator('.ProseMirror')).toBeVisible({ timeout: 30_000 })

    const result = await page.evaluate(async () => {
      const size = 20 * 1024 * 1024
      const bytes = new Uint8Array(size)
      // fill with a repeating 64KB block: representative compressibility, and
      // no dependency on crypto.getRandomValues quotas
      crypto.getRandomValues(bytes.subarray(0, 65536))
      for (let i = 65536; i < size; i += 65536) {
        bytes.copyWithin(i, 0, Math.min(65536, size - i))
      }

      const started = performance.now()
      const url = URL.createObjectURL(new Blob([bytes]))
      const buildMs = performance.now() - started

      // the renderer fetches it exactly once, which is the contract
      const fetched = new Uint8Array(await (await fetch(url)).arrayBuffer()).byteLength
      return { size, urlLength: url.length, buildMs, fetched }
    })

    expect(result.fetched).toBe(result.size)
    // The durable property is the payload's *shape*, not the clock: a URL, not
    // 27MB of base64 string. Wall time for createObjectURL is dominated by
    // buffer allocation and GC and swings 5-300ms run to run, so asserting on it
    // produces a flaky test that says nothing about the design.
    expect(result.urlLength).toBeLessThan(200)
    expect(result.buildMs).toBeLessThan(2_000)
  })
})
