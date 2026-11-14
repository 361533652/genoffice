import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { expect, test, type Page } from '@playwright/test'

/**
 * PDF on a mobile host.
 *
 * The PDF app's display path is `pdfjs-dist`, which is web-native, so the
 * question is whether a page rasterises in a browser with no Electron preload.
 * Counting dark pixels is the cheap proof that a render happened, as opposed to
 * a blank canvas being reported as success.
 *
 * The render runs in the docs renderer rather than the PDF app, for a mundane
 * reason: when this was written I could not get a fixture into the PDF app before
 * its mount effect ran, and concluded the app "navigates during its no-file
 * boot". That diagnosis was wrong — a setInterval poller simply loses the race
 * against mount. e2e/mobile-pdf-app.spec.ts now opens a real file through the
 * PDF app's own load path with a defineProperty intercept.
 *
 * This spec keeps a narrower question: can pdf.js rasterise a page in a WebView
 * at all, independent of any app's loading sequence.
 */

const DOCS_URL = process.env.MOBILE_DOCS_URL ?? 'http://127.0.0.1:5199'
const PDF_APP_URL = process.env.MOBILE_PDF_URL ?? 'http://127.0.0.1:5203'
const REPO = process.cwd()
const FIXTURE = join(REPO, 'e2e', 'assets', 'mobile-sample.pdf')

test.describe('pdf on a mobile host', () => {
  test('pdf.js rasterises a page with visible ink', async ({ page }) => {
    await page.goto(DOCS_URL, { waitUntil: 'load' })
    await expect(page.locator('.ProseMirror')).toBeVisible({ timeout: 30_000 })
    const base64 = readFileSync(FIXTURE).toString('base64')

    const result = await page.evaluate(async (b64) => {
      const pdfjs = await import('/@id/pdfjs-dist/legacy/build/pdf.mjs')
      const workerUrl = (await import('/@id/pdfjs-dist/legacy/build/pdf.worker.min.mjs?url')).default
      ;(pdfjs as unknown as { GlobalWorkerOptions: { workerSrc: string } }).GlobalWorkerOptions.workerSrc =
        workerUrl

      const bin = atob(b64)
      const data = new Uint8Array(bin.length)
      for (let i = 0; i < bin.length; i++) data[i] = bin.charCodeAt(i)

      const doc = await pdfjs.getDocument({ data, isEvalSupported: false }).promise
      const pdfPage = await doc.getPage(1)
      const viewport = pdfPage.getViewport({ scale: 1 })
      const canvas = document.createElement('canvas')
      canvas.width = Math.ceil(viewport.width)
      canvas.height = Math.ceil(viewport.height)
      const ctx = canvas.getContext('2d')!
      await pdfPage.render({ canvasContext: ctx, viewport, canvas } as never).promise

      const px = ctx.getImageData(0, 0, canvas.width, canvas.height).data
      let dark = 0
      for (let i = 0; i < px.length; i += 4) if (px[i]! < 240) dark += 1
      return { pages: doc.numPages, width: canvas.width, height: canvas.height, darkPixels: dark }
    }, base64)

    expect(result.pages).toBe(1)
    expect(result.width).toBe(300)
    expect(result.height).toBe(200)
    // the page carries text, so a blank render fails here
    expect(result.darkPixels).toBeGreaterThan(100)
  })

  test('the pdf app boots to its empty state with no preload', async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', (e) => errors.push(String(e)))
    await page.goto(PDF_APP_URL, { waitUntil: 'load' })
    // no pending file -> the honest empty state, not a stuck "opening" screen
    await expect(page.getByText('没有要打开的文件')).toBeVisible({ timeout: 30_000 })
    expect(errors).toEqual([])
  })
})
