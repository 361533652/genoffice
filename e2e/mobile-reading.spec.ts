import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { expect, test, type Page } from '@playwright/test'

/**
 * What "reading a document on a phone" actually means for this app.
 *
 * I set out to test finger-scrolling and could not: multi-page documents are
 * laid out at a width-fit zoom (43% at 390px), so a five-page file fits the
 * viewport and no container overflows. Measured on .editor-scroll:
 * scrollHeight == clientHeight in every configuration tried.
 *
 * That is a consequence of the zoom choice, not a bug — but it means the thing
 * worth asserting is different from what I expected:
 *
 *  - the whole document is reachable without scrolling (it is all in view), and
 *  - a finger drag does not break anything while it is there.
 *
 * Whether the 43% default is the right trade-off is a product question recorded
 * in the ADR, not something this test should decide.
 */

const DOCS_URL = process.env.MOBILE_DOCS_URL ?? 'http://127.0.0.1:5199'
const REPO = process.cwd()
const FIXTURE = join(REPO, 'e2e', 'assets', 'cover-photo-with-textboxes.docx')

test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true })

async function openDocument(page: Page): Promise<void> {
  await page.goto(DOCS_URL, { waitUntil: 'load' })
  await expect(page.locator('.ProseMirror')).toBeVisible({ timeout: 30_000 })

  const docx = readFileSync(FIXTURE)
  await page.evaluate(async (base64) => {
    const bin = atob(base64)
    const bytes = new Uint8Array(bin.length)
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
    const shim = window.desktop as unknown as Record<string, unknown>
    shim.openDocx = async () => ({
      path: 'host/browser-1/cover.docx',
      name: 'cover.docx',
      dataUrl: URL.createObjectURL(new Blob([bytes])),
      hash: 'x',
    })
    shim.confirmDocumentReplace = async () => true
  }, docx.toString('base64'))

  page.once('dialog', (d) => void d.accept())
  await page.getByRole('button', { name: '文件', exact: true }).click()
  await page.getByRole('button', { name: /打开/ }).first().click()
  await expect(page.locator('body')).toContainText(/共 \d+ 页/, { timeout: 30_000 })
}

test.describe('reading a document on a phone', () => {
  test('a multi-page document fits the viewport at the default zoom', async ({ page }) => {
    await openDocument(page)

    const layout = await page.evaluate(() => {
      const scroller = document.querySelector('.editor-scroll')
      const page1 = document.querySelector('.ProseMirror')
      if (!scroller || !page1) return null
      return {
        needsScroll: scroller.scrollHeight > scroller.clientHeight + 5,
        // the page width must not exceed the pane: horizontal overflow would be
        // a real defect, vertical is the zoom trade-off
        overflowsWidth: page1.getBoundingClientRect().width > scroller.clientWidth + 2,
        pages: (document.body.innerText.match(/共 (\d+) 页/) ?? [])[1],
      }
    })

    expect(layout, 'editor layout').not.toBeNull()
    // the page count is whatever the file actually is; the assertion is that a
    // document opened at all, not that it has a particular shape
    expect(Number(layout!.pages), 'page count reported').toBeGreaterThanOrEqual(1)
    // whatever the zoom does, the page must never be wider than the screen
    expect(layout!.overflowsWidth, 'page wider than the viewport').toBe(false)
    // and at this zoom a five-page file fits, so no scrolling is required
    expect(layout!.needsScroll, 'unexpected scroll requirement').toBe(false)
  })

  test('a finger drag over the document does not throw or scroll sideways', async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', (e) => errors.push(String(e)))
    await openDocument(page)

    const scroller = page.locator('.editor-scroll')
    const box = (await scroller.boundingBox())!
    const before = await scroller.evaluate((el) => ({ top: el.scrollTop, left: el.scrollLeft }))
    const scrollWidth = await scroller.evaluate((el) => el.scrollWidth)

    const cdp = await page.context().newCDPSession(page)
    const x = box.x + box.width / 2
    const startY = box.y + box.height * 0.8
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y: startY }] })
    for (let i = 1; i <= 12; i++) {
      await cdp.send('Input.dispatchTouchEvent', {
        type: 'touchMove',
        touchPoints: [{ x, y: startY - i * 28 }],
      })
      await page.waitForTimeout(20)
    }
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
    await page.waitForTimeout(600)

    const after = await scroller.evaluate((el) => ({ top: el.scrollTop, left: el.scrollLeft }))
    // the gesture must not drag the document sideways: that would fight every
    // attempt to scroll, and is the failure mode a fixed-width page invites
    expect(after.left, 'scrolled horizontally').toBe(before.left)
    expect(scrollWidth).toBeLessThanOrEqual(box.width + 2)
    expect(errors).toEqual([])
  })
})