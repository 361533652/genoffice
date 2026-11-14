import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { expect, test, type Page } from '@playwright/test'

/**
 * Opening a second document must ask before discarding the first.
 *
 * The shim used to answer `confirmDocumentReplace` with a bare `true`, so an
 * open silently discarded unsaved edits — the one outcome a confirmation must
 * never produce. It now defers to the platform confirm, and a host without one
 * refuses.
 *
 * The flow is: open a real document, type into it (making it dirty), then try to
 * open another. With the dialog dismissed the first document must survive.
 */

const DOCS_URL = process.env.MOBILE_DOCS_URL ?? 'http://127.0.0.1:5199'
const REPO = process.cwd()

test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true })

/** Hand the renderer a real .docx and open it through File > Open. */
async function openFirstDocument(page: Page): Promise<void> {
  await page.goto(DOCS_URL, { waitUntil: 'load' })
  await expect(page.locator('.ProseMirror')).toBeVisible({ timeout: 30_000 })

  const docx = readFileSync(join(REPO, 'fixtures', 'generated', 'kitchen-sink.docx'))
  await page.evaluate(async (base64) => {
    const bin = atob(base64)
    const bytes = new Uint8Array(bin.length)
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
    const shim = window.desktop as unknown as Record<string, unknown>
    shim.openDocx = async () => ({
      path: 'host/browser-1/kitchen-sink.docx',
      name: 'kitchen-sink.docx',
      dataUrl: URL.createObjectURL(new Blob([bytes])),
      hash: 'x',
    })
  }, docx.toString('base64'))

  // register before clicking: a dialog raised by the click fires immediately
  page.once('dialog', (d) => void d.accept())
  await page.getByRole('button', { name: '文件', exact: true }).click()
  await page.getByRole('button', { name: /打开/ }).first().click()
  await expect(page.locator('.ProseMirror')).toContainText('第一章', { timeout: 30_000 })
}

test.describe('discarding a document needs consent', () => {
  test('dismissing the prompt keeps the current document', async ({ page }) => {
    await openFirstDocument(page)

    // make it dirty, so a replacement would lose something
    const box = (await page.locator('.ProseMirror').boundingBox())!
    await page.mouse.click(box.x + 120, box.y + 140)
    await page.keyboard.type('UNSAVED-EDIT')
    await expect(page.locator('.ProseMirror')).toContainText('UNSAVED-EDIT')

    // dismiss the consent prompt: the open must abort
    let prompted = false
    page.once('dialog', (d) => {
      prompted = true
      void d.dismiss()
    })
    await page.getByRole('button', { name: '文件', exact: true }).click()
    await page.getByRole('button', { name: /打开/ }).first().click()
    await page.waitForTimeout(2_000)

    expect(prompted, 'the app asked before discarding').toBe(true)
    // and the edit is still there
    await expect(page.locator('.ProseMirror')).toContainText('UNSAVED-EDIT')
  })

  test('the shim asks rather than answering true', async ({ page }) => {
    await page.goto(DOCS_URL, { waitUntil: 'load' })
    await expect(page.locator('.ProseMirror')).toBeVisible({ timeout: 30_000 })
    page.once('dialog', (d) => void d.dismiss())
    const answer = await page.evaluate(async () => {
      const shim = window.desktop as unknown as { confirmDocumentReplace: () => Promise<boolean> }
      return shim.confirmDocumentReplace()
    })
    expect(answer).toBe(false)
  })
})
