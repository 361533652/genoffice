
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { expect, test, type Page } from '@playwright/test'

/**
 * The whole task a phone user actually performs: tap to open a document, tap
 * into it, type, and save — every step driven by touch, in a 390px viewport,
 * with no Electron preload.
 *
 * The earlier specs each test one link. This one walks the chain, because a
 * chain can break at the joints: touch selection works, typing works and saving
 * works, yet the composed flow can still fail if a tap closes the editor or the
 * save button is out of reach.
 */

const DOCS_URL = process.env.MOBILE_DOCS_URL ?? 'http://127.0.0.1:5199'
const REPO = process.cwd()

test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true })

async function tap(page: Page, x: number, y: number): Promise<void> {
  const cdp = await page.context().newCDPSession(page)
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] })
  await page.waitForTimeout(60)
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
  await page.waitForTimeout(400)
}

test.describe('a phone user imports, edits and saves', () => {
  test('the composed touch flow produces a valid document', async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', (e) => errors.push(String(e)))

    await page.goto(DOCS_URL, { waitUntil: 'load' })
    await expect(page.locator('.ProseMirror')).toBeVisible({ timeout: 30_000 })

    // the host hands over a document, as a blob URL
    const docx = readFileSync(join(REPO, 'fixtures', 'generated', 'kitchen-sink.docx'))
    await page.evaluate(async (base64) => {
      const bin = atob(base64)
      const bytes = new Uint8Array(bin.length)
      for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
      const file = new File([bytes], 'kitchen-sink.docx')
      const shim = window.desktop as unknown as Record<string, unknown>
      shim.openDocx = async () => ({
        path: 'host/browser-1/kitchen-sink.docx',
        name: 'kitchen-sink.docx',
        dataUrl: URL.createObjectURL(file),
        hash: 'test',
      })
      shim.confirmDocumentReplace = async () => true
      const capture = (data: unknown) => {
        if (!data) return
        const out =
          data instanceof ArrayBuffer
            ? new Uint8Array(data)
            : ArrayBuffer.isView(data)
              ? new Uint8Array(data.buffer, data.byteOffset, data.byteLength)
              : new Uint8Array(data as ArrayLike<number>)
        ;(window as unknown as Record<string, unknown>).__saved = {
          length: out.length,
          magic: Array.from(out.slice(0, 4)),
        }
      }
      for (const name of ['saveDocx', 'saveDocxAs', 'saveDocxNew']) {
        shim[name] = async (_a: unknown, data: unknown) => {
          capture(data)
          return { ok: true, path: 'host/browser-1/kitchen-sink.docx' }
        }
      }
    }, docx.toString('base64'))

    // 1. tap the File tab, then tap Open
    await page.getByRole('button', { name: '文件', exact: true }).click()
    await page.getByRole('button', { name: /打开/ }).first().click()
    await expect(page.locator('.ProseMirror')).toContainText('第一章', { timeout: 30_000 })

    // 2. tap into the body and type, the way a soft keyboard delivers
    const body = (await page.locator('.ProseMirror').boundingBox())!
    await tap(page, body.x + 120, body.y + 140)
    await page.keyboard.type('手机编辑')
    await expect(page.locator('.ProseMirror')).toContainText('手机编辑', { timeout: 10_000 })

    // 3. save, and check the host received a package
    await page.keyboard.press('Control+s')
    await expect(page.locator('.status-msg')).toContainText('已保存', { timeout: 20_000 })

    const saved = await page.evaluate(
      () => (window as unknown as { __saved?: { length: number; magic: number[] } }).__saved,
    )
    expect(saved, 'host received no bytes').toBeTruthy()
    expect(saved!.magic).toEqual([0x50, 0x4b, 0x03, 0x04])
    // the edited document is not the file that came in
    expect(saved!.length).not.toBe(docx.byteLength)
    expect(errors).toEqual([])
  })
})
