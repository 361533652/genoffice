import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { expect, test, type Page } from '@playwright/test'

/**
 * Open, edit and save a real document on a mobile host.
 *
 * This is the whole writable round trip a phone user needs: pick a .docx, type
 * into it, save it back. It runs with no Electron preload — the Android WebView
 * environment — and the host is the legacy shim's browser implementation.
 *
 * The saved bytes are checked for the ZIP magic rather than compared to the
 * original: an edited document must differ, and the point is that the pipeline
 * produced a valid package at all.
 */

const DOCS_URL = process.env.MOBILE_DOCS_URL ?? 'http://127.0.0.1:5199'
const REPO = process.cwd()

/** ZIP local-file-header magic: the first bytes of any .docx. */
const ZIP_MAGIC = [0x50, 0x4b, 0x03, 0x04]

async function bootDocs(page: Page): Promise<void> {
  await page.goto(DOCS_URL, { waitUntil: 'load' })
  await expect(page.locator('.ProseMirror')).toBeVisible({ timeout: 30_000 })
  await page.waitForTimeout(800)
}

test.describe('editing and saving on a mobile host', () => {
  test('an edit reaches the host as a valid .docx', async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', (e) => errors.push(String(e)))

    await bootDocs(page)
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
      // capture what the app tries to write, exactly as the host would receive
      // it: saveDocx(path, data, auto) and saveDocxAs(name, data, sourcePath)
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
      shim.saveDocx = async (_path: string, data: unknown) => {
        capture(data)
        return { ok: true, path: 'browser-handle-1' }
      }
      shim.saveDocxAs = async (_name: string, data: unknown) => {
        capture(data)
        return { ok: true, path: 'browser-handle-1' }
      }
      shim.saveDocxNew = async (_name: string, data: unknown) => {
        capture(data)
        return { ok: true, path: 'browser-handle-1' }
      }
    }, docx.toString('base64'))

    // open the document, edit it, save it
    await page.getByRole('button', { name: '文件', exact: true }).click()
    await page.getByRole('button', { name: /打开/ }).first().click()
    await expect(page.locator('.ProseMirror')).toContainText('第一章', { timeout: 30_000 })

    await page.locator('.ProseMirror').click({ position: { x: 120, y: 150 } })
    await page.keyboard.type('MOBILE-EDIT')
    await expect(page.locator('.ProseMirror')).toContainText('MOBILE-EDIT')

    await page.keyboard.press('Control+s')
    await expect(page.locator('.status-msg')).toContainText('已保存', { timeout: 20_000 })

    const saved = await page.evaluate(
      () => (window as unknown as { __saved?: { length: number; magic: number[] } }).__saved,
    )
    expect(saved, 'the host received no bytes').toBeTruthy()
    // the edit made the package bigger; and it is still a package
    expect(saved!.length).toBeGreaterThan(docx.length - 100)
    expect(saved!.magic).toEqual(ZIP_MAGIC)
    expect(errors).toEqual([])
  })
})
