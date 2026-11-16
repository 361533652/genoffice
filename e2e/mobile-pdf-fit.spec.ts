import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { expect, test, type Page } from '@playwright/test'

/**
 * P0-2 / P0-5 — PDF reading on a portrait phone.
 *
 * Guards the two fit-formula landmines the interaction review found:
 *  - the thumbnail sidebar used to open by default and eat 38% of the width;
 *  - the 300px comments margin (NOTE_MARGIN_W) was carved out of the fit width,
 *    collapsing an annotated page to 26px.
 * On a phone the page must own the full width, the sidebar must be an overlay
 * drawer that steals no width, and the reading tools (page/zoom/fit/search)
 * must sit in the first screen without scrolling the ribbon.
 */

const PDF_URL = process.env.MOBILE_PDF_URL ?? 'http://127.0.0.1:5203'
const REPO = process.cwd()
const FIXTURE = join(REPO, 'e2e', 'assets', 'mobile-sample.pdf')
const PHONE = { width: 390, height: 844 }

test.use({ viewport: PHONE, hasTouch: true, isMobile: true, deviceScaleFactor: 2 })

/** A phone starts with the command band collapsed; these specs measure the band. */
async function expandBand(page: Page): Promise<void> {
  if (await page.locator('[data-ribbon-body]').isVisible()) return
  await page.keyboard.press('Control+F1')
  await expect(page.locator('[data-ribbon-body]')).toBeVisible({ timeout: 10_000 })
}

/** Open the sample through the app's own consumePending → readFileChunk path. */
async function openSample(page: Page): Promise<void> {
  const fixture = readFileSync(FIXTURE)
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
  // the page count text lands a frame before the first rasterised canvas
  await page.waitForSelector('.pdf-page canvas', { timeout: 30_000 })
}

/** width of the first rendered page canvas */
async function pageCanvasWidth(page: Page): Promise<number> {
  return page.evaluate(() => {
    const canvas = document.querySelector('.pdf-page canvas') as HTMLCanvasElement | null
    return canvas ? canvas.getBoundingClientRect().width : 0
  })
}

test.describe('PDF fit on a portrait phone', () => {
  test('opens with no sidebar and the page at full width', async ({ page }) => {
    await openSample(page)

    // no sidebar in the flow: the drawer pane is absent until opened
    expect(await page.locator('.pdf-thumbs').count(), 'sidebar open by default').toBe(0)

    const width = await pageCanvasWidth(page)
    // ≥87% of the viewport (spec baseline 341px; the 8px gutter earns even more)
    expect(width, 'page canvas width').toBeGreaterThanOrEqual(PHONE.width * 0.87)

    const zoomText = await page.locator('.tb-zoom').first().innerText()
    const zoom = Number(zoomText.replace('%', ''))
    expect(zoom, 'fit-width zoom').toBeGreaterThanOrEqual(114)

    // no page-level horizontal overflow
    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth)
    expect(scrollWidth).toBeLessThanOrEqual(PHONE.width)
  })

  test('the thumbnail drawer overlays without changing the page width', async ({ page }) => {
    await openSample(page)
    await expandBand(page)
    const before = await pageCanvasWidth(page)

    // open the thumbnails drawer (the button lives in the view-nav group)
    await page.getByRole('button', { name: /缩略图|Thumbnails/ }).first().click()
    await expect(page.locator('.pdf-thumbs-drawer')).toBeVisible()

    const during = await pageCanvasWidth(page)
    expect(during, 'page width while the drawer is open').toBe(before)

    // the scrim dismisses it
    await page.locator('.pdf-side-scrim').click({ position: { x: 380, y: 400 } })
    await expect(page.locator('.pdf-thumbs-drawer')).toHaveCount(0)
    expect(await pageCanvasWidth(page), 'page width after close').toBe(before)
  })

  test('reading tools sit in the first screen without scrolling the ribbon', async ({ page }) => {
    await openSample(page)
    await expandBand(page)
    // P0-5: page input, zoom −/+, fit-width and search are visible at scrollLeft 0
    const reach = await page.evaluate(() => {
      const body = document.querySelector('.ribbon-body') as HTMLElement | null
      if (!body) return null
      body.scrollLeft = 0
      const vw = window.innerWidth
      const rect = (sel: string) => {
        const el = document.querySelector(sel)
        if (!el) return null
        const r = el.getBoundingClientRect()
        return { left: r.left, right: r.right, visible: r.width > 0 && r.right <= vw + 1 && r.left >= -1 }
      }
      return {
        pageInput: rect('.tb-page-input'),
        zoomOut: rect('.tb-zoom'),
        fitWidth: Array.from(document.querySelectorAll('.rb-big')).find((b) =>
          /适应宽度|Fit Width/i.test(b.textContent ?? ''),
        )?.getBoundingClientRect().right ?? null,
        vw,
      }
    })
    expect(reach).not.toBeNull()
    expect(reach!.pageInput?.visible, 'page number input on first screen').toBe(true)
    expect(reach!.zoomOut?.visible, 'zoom readout on first screen').toBe(true)
    expect(reach!.fitWidth, 'fit-width within the viewport').not.toBeNull()
    expect(reach!.fitWidth!, 'fit-width right edge').toBeLessThanOrEqual(reach!.vw + 1)
  })
})
