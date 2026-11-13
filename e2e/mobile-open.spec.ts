import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { expect, test, type Page } from '@playwright/test'

/**
 * Opening a real document on a mobile host, through the app's own UI.
 *
 * The engines being able to parse bytes is not the same as a user being able to
 * open a file: the renderer fetches the bytes from a URL the host hands it
 * (`OpenFileResult.dataUrl`), and the Content-Security-Policy decides whether
 * that fetch is allowed. It was not — `connect-src` listed neither `blob:` nor
 * `data:`, so every open failed with "Failed to fetch" and the document stayed
 * blank while the menu appeared to work.
 *
 * This test drives the real File > Open path with a blob URL standing in for
 * the system picker, which is what Accept-Open/SAF will supply on Android.
 */

const DOCS_URL = process.env.MOBILE_DOCS_URL ?? 'http://127.0.0.1:5199'
const REPO = process.cwd()

async function bootDocs(page: Page): Promise<void> {
  await page.goto(DOCS_URL, { waitUntil: 'load' })
  await expect(page.locator('.ProseMirror')).toBeVisible({ timeout: 30_000 })
  await page.waitForTimeout(800)
}

test.describe('opening a document on a mobile host', () => {
  test('a real .docx reaches the editor through File > Open', async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', (e) => errors.push(String(e)))

    await bootDocs(page)

    // stand in for the native picker: hand the renderer a blob URL, exactly the
    // shape OpenFileResult carries on the desktop
    const docx = readFileSync(join(REPO, 'fixtures', 'generated', 'kitchen-sink.docx'))
    await page.evaluate(async (base64) => {
      const bin = atob(base64)
      const bytes = new Uint8Array(bin.length)
      for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
      const url = URL.createObjectURL(new Blob([bytes]))
      const shim = window.desktop as unknown as Record<string, unknown>
      shim.openDocx = async () => ({
        path: 'browser-handle-1',
        name: 'kitchen-sink.docx',
        dataUrl: url,
        hash: 'test',
      })
      shim.confirmDocumentReplace = async () => true
    }, docx.toString('base64'))

    await page.getByRole('button', { name: '文件', exact: true }).click()
    await page.getByRole('button', { name: /打开/ }).first().click()

    // the document's own text, not just "some text": the fixture opens with
    // this heading and ends with this paragraph
    const body = page.locator('.ProseMirror')
    await expect(body).toContainText('第一章', { timeout: 30_000 })
    await expect(body).toContainText('编辑尾段')

    // and the file identity arrived with it: the window title carries the name
    // and the status bar reports the open
    await expect(page).toHaveTitle('kitchen-sink.docx')
    await expect(page.locator('.status-msg')).toContainText('kitchen-sink.docx')
    expect(errors).toEqual([])
  })

  test('the CSP allows the blob URL the host hands over', async ({ page }) => {
    await bootDocs(page)
    // the specific regression: connect-src omitted blob:/data:
    const allowed = await page.evaluate(async () => {
      const url = URL.createObjectURL(new Blob([new Uint8Array([1, 2, 3])]))
      try {
        const res = await fetch(url)
        return (await res.arrayBuffer()).byteLength === 3
      } catch {
        return false
      }
    })
    expect(allowed).toBe(true)
  })
})
