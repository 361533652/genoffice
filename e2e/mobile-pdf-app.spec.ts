import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { expect, test } from '@playwright/test'

/**
 * The PDF app opening a document on a host with no preload.
 *
 * The earlier PDF spec only proved that pdf.js can rasterise a page — it did
 * that in the docs renderer, because the PDF app "navigated during its no-file
 * boot". That turned out to be the probe's fault, not the app's: a setInterval
 * poller loses the race against mount. Intercepting the global's assignment with
 * defineProperty works, and with it the real app opens a real file.
 *
 * What this covers that nothing else did: the PDF app's own load path
 * (consumePending -> readFileChunk in 8MB slabs -> pdf.js view -> canvases).
 */

const PDF_URL = process.env.MOBILE_PDF_URL ?? 'http://127.0.0.1:5203'
const REPO = process.cwd()
const FIXTURE = join(REPO, 'e2e', 'assets', 'mobile-sample.pdf')

test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true })

test.describe('pdf app on a mobile host', () => {
  test('opens a real file through its own load path', async ({ page }) => {
    const fixture = readFileSync(FIXTURE)

    // Install the stub before any app script runs: the shim assigns window.pdfApi
    // during module evaluation, and a poller loses that race.
    await page.addInitScript(
      ({ base64 }) => {
        const bin = atob(base64)
        const bytes = new Uint8Array(bin.length)
        for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
        const file = new File([bytes], 'sample.pdf', { type: 'application/pdf' })

        const w = window as unknown as Record<string, unknown> & { __trace?: string[] }
        w.__trace = []
        let real: Record<string, unknown> | undefined
        Object.defineProperty(w, 'pdfApi', {
          configurable: true,
          get() {
            return real
          },
          set(value: Record<string, unknown>) {
            real = new Proxy(value, {
              get(target, prop: string) {
                if (prop === 'consumePending') {
                  return async () => {
                    w.__trace!.push('consumePending')
                    return 'host/browser-1/sample.pdf'
                  }
                }
                if (prop === 'readFileChunk') {
                  return async (_path: string, offset: number, end: number) => {
                    w.__trace!.push('chunk')
                    const stop = Math.min(end, file.size)
                    return {
                      data: new Uint8Array(await file.slice(offset, stop).arrayBuffer()),
                      fileSize: file.size,
                    }
                  }
                }
                return target[prop]
              },
            })
          },
        })
      },
      { base64: fixture.toString('base64') },
    )

    const errors: string[] = []
    page.on('pageerror', (e) => errors.push(String(e)))

    await page.goto(PDF_URL, { waitUntil: 'load' })
    // the app reports the page count once a document is open
    await expect(page.locator('body')).toContainText(/共 \d+ 页/, { timeout: 30_000 })

    const state = await page.evaluate(() => ({
      trace: (window as unknown as { __trace: string[] }).__trace,
      canvases: document.querySelectorAll('canvas').length,
      // the toolbar appears only in the ready state; the empty note does not
      empty: document.body.innerText.includes('没有要打开的文件'),
    }))

    // the app used its own path: ask the host, then read in chunks
    expect(state.trace).toContain('consumePending')
    expect(state.trace).toContain('chunk')
    expect(state.empty, 'still on the empty state').toBe(false)
    expect(state.canvases, 'pages rasterised').toBeGreaterThan(0)
    expect(errors).toEqual([])
  })
})
