import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { expect, test, type Page } from '@playwright/test'

/**
 * Two-finger pinch in the PDF reader.
 *
 * Before this a pinch zoomed the whole page (visualViewport scale > 1): the
 * chrome magnified and the document slid off screen, while the viewer's own
 * scale never changed. The reader must own the gesture — the page zooms, the UI
 * stays put — and one-finger scrolling must keep working.
 */

const PDF_URL = process.env.MOBILE_PDF_URL ?? 'http://127.0.0.1:5203'
const FIXTURE = join(process.cwd(), 'e2e', 'assets', 'mobile-sample.pdf')
/** multi-page, so one-finger scrolling has somewhere to go */
const MULTI_PAGE = join(process.cwd(), 'apps', 'pdf', 'tests', 'fixtures', 'plain-sample.pdf')

test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, deviceScaleFactor: 2 })

async function openSample(page: Page, path = FIXTURE): Promise<void> {
  const fixture = readFileSync(path)
  await page.addInitScript(
    ({ base64 }) => {
      const bin = atob(base64)
      const bytes = new Uint8Array(bin.length)
      for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
      const file = new File([bytes], 'sample.pdf', { type: 'application/pdf' })
      const w = window as unknown as Record<string, unknown>
      let real: Record<string, unknown> | undefined
      Object.defineProperty(w, 'pdfApi', {
        configurable: true,
        get() {
          return real
        },
        set(value: Record<string, unknown>) {
          real = new Proxy(value, {
            get(target, prop: string) {
              if (prop === 'consumePending') return async () => 'host/browser-1/sample.pdf'
              if (prop === 'readFileChunk') {
                return async (_path: string, offset: number, end: number) => {
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
  await page.goto(PDF_URL, { waitUntil: 'load' })
  await expect(page.locator('body')).toContainText(/共 \d+ 页/, { timeout: 30_000 })
  await page.waitForSelector('.pdf-page canvas', { timeout: 30_000 })
}

const zoomText = (page: Page) => page.locator('.tb-zoom').innerText()

test('a pinch zooms the page, not the phone UI', async ({ page }) => {
  test.setTimeout(120_000)
  await openSample(page)
  await page.waitForTimeout(600)
  const before = await zoomText(page)

  const cdp = await page.context().newCDPSession(page)
  await cdp.send('Input.dispatchTouchEvent', {
    type: 'touchStart',
    touchPoints: [{ x: 160, y: 420, id: 1 }, { x: 230, y: 420, id: 2 }],
  })
  for (let i = 1; i <= 8; i++) {
    await cdp.send('Input.dispatchTouchEvent', {
      type: 'touchMove',
      touchPoints: [{ x: 160 - i * 7, y: 420, id: 1 }, { x: 230 + i * 7, y: 420, id: 2 }],
    })
    await page.waitForTimeout(30)
  }
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
  await page.waitForTimeout(800)

  // the viewer's own zoom moved
  expect(await zoomText(page), 'pinching out zooms the page').not.toBe(before)
  // and the UI did NOT page-zoom (that was the bug: chrome magnified, document off screen)
  const vvScale = await page.evaluate(() => window.visualViewport?.scale ?? 1)
  expect(vvScale, 'the phone UI stays at 1:1').toBe(1)
})

test('one-finger scrolling still works after owning the pinch', async ({ page }) => {
  test.setTimeout(120_000)
  await openSample(page, MULTI_PAGE)
  await page.waitForTimeout(800)
  // make the document taller than the viewport first: a one-page fit has
  // scrollHeight === clientHeight and the drag below would prove nothing.
  const zoomIn = page.getByRole('button', { name: /放大|zoom in/i }).first()
  for (let i = 0; i < 5; i++) {
    if (await zoomIn.isVisible().catch(() => false)) await zoomIn.click()
    await page.waitForTimeout(200)
  }
  await page.waitForTimeout(500)
  const scrollable = await page.evaluate(() => {
    const el = document.querySelector('.pdf-scroll')!
    return el.scrollHeight > el.clientHeight + 40
  })
  expect(scrollable, 'the fixture must be taller than the phone viewport').toBe(true)
  const top0 = await page.evaluate(() => document.querySelector('.pdf-scroll')!.scrollTop)
  const cdp = await page.context().newCDPSession(page)
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: 195, y: 700 }] })
  for (let i = 1; i <= 8; i++) {
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: 195, y: 700 - i * 30 }] })
    await page.waitForTimeout(25)
  }
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
  await page.waitForTimeout(600)
  const top1 = await page.evaluate(() => document.querySelector('.pdf-scroll')!.scrollTop)
  expect(top1, 'a one-finger drag still scrolls the document').toBeGreaterThan(top0)
})
