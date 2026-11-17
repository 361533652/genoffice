import { expect, test, type Page } from '@playwright/test'

/**
 * P0-4 / P1-1 / P1-4 — portrait containment scan across all six editors.
 *
 * The interaction review's overflow rule: an element whose box crosses the
 * viewport edge is a layout defect ONLY when it is not inside a horizontally
 * scrollable container (inside one it is reachable, just undiscoverable). This
 * spec boots every app at 390×844 and asserts there is no unreachable layout
 * overflow and the document never grows past the device width — the regression
 * guard for the clipped sheets band, the over-wide dialogs and galleries, and
 * the status bars that used to paint past the right edge.
 */

const PHONE = { width: 390, height: 844 }

test.use({ viewport: PHONE, hasTouch: true, isMobile: true, deviceScaleFactor: 2 })

const APPS = [
  { name: 'docs', url: 'http://127.0.0.1:5199', ready: '.ProseMirror' },
  { name: 'sheets', url: 'http://127.0.0.1:5201', ready: '.ribbon-tabs' },
  { name: 'slides', url: 'http://127.0.0.1:5202', ready: '.ribbon-tabs' },
  { name: 'pdf', url: 'http://127.0.0.1:5203', ready: 'body' },
  { name: 'markdown', url: 'http://127.0.0.1:5204', ready: 'body' },
  { name: 'html', url: 'http://127.0.0.1:5205', ready: 'body' },
]

/** Elements crossing the viewport edge that no scroll container can reach. */
async function layoutOverflow(page: Page): Promise<string[]> {
  return page.evaluate(() => {
    const vw = window.innerWidth
    const scrollable = (el: Element) => {
      const ox = getComputedStyle(el).overflowX
      return (ox === 'auto' || ox === 'scroll') && el.scrollWidth > el.clientWidth + 1
    }
    const inScroller = (el: Element) => {
      let p = el.parentElement
      while (p && p !== document.documentElement) {
        if (scrollable(p)) return true
        p = p.parentElement
      }
      return false
    }
    const offenders: string[] = []
    for (const el of document.querySelectorAll('body *')) {
      const cs = getComputedStyle(el)
      if (cs.display === 'none' || cs.visibility === 'hidden') continue
      // the slides stage is a pannable/zoomable document surface (Konva), not
      // chrome — its canvas may legitimately exceed the viewport
      if (el.closest('.stage-col')) continue
      const r = el.getBoundingClientRect()
      if (r.width === 0 || r.height === 0) continue
      // a stashed/off-canvas popover is not a layout defect
      if (r.right < 0 || r.left > vw) continue
      if (r.right > vw + 1 || r.left < -1) {
        if (!inScroller(el)) {
          const cls = (el.className?.toString?.() ?? '').slice(0, 48)
          offenders.push(
            `${el.tagName.toLowerCase()}.${cls} [${Math.round(r.left)}..${Math.round(r.right)}]`,
          )
        }
      }
    }
    return offenders.slice(0, 20)
  })
}

for (const app of APPS) {
  test.describe(`${app.name} portrait containment`, () => {
    test('no unreachable layout overflow at 390px', async ({ page }) => {
      const errors: string[] = []
      page.on('pageerror', (e) => errors.push(String(e)))
      await page.goto(app.url, { waitUntil: 'load' })
      await expect(page.locator(app.ready).first()).toBeVisible({ timeout: 30_000 })
      await page.waitForTimeout(1_500)

      const docWidth = await page.evaluate(() => document.documentElement.scrollWidth)
      expect(docWidth, `${app.name} document scroll width`).toBeLessThanOrEqual(PHONE.width)

      const offenders = await layoutOverflow(page)
      expect(offenders, `${app.name} layout overflow:\n${offenders.join('\n')}`).toEqual([])
      expect(errors).toEqual([])
    })
  })
}
