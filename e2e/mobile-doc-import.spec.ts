import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { expect, test, type Page } from '@playwright/test'

/**
 * Legacy Word (.doc) on a mobile host.
 *
 * The desktop main process converts .doc to a .docx copy before opening; a
 * WebView host has no main process, so the renderer now runs the same import
 * filter (doc2docx) before parsing. Without it the docx parser hit a compound
 * file and the app showed "打开失败: ..." — the user's report.
 */

const DOCS_URL = process.env.MOBILE_DOCS_URL ?? 'http://127.0.0.1:5199'
const REPO = process.cwd()
const FIXTURE = join(REPO, 'packages', 'doc2docx', 'tests', 'fixtures', 'text-basic.doc')

async function bootDocs(page: Page): Promise<void> {
  await page.goto(DOCS_URL, { waitUntil: 'load' })
  await expect(page.locator('.ProseMirror')).toBeVisible({ timeout: 30_000 })
  await page.waitForTimeout(800)
}

test.describe('opening a legacy .doc on a mobile host', () => {
  test('a real .doc is converted and reaches the editor', async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', (e) => errors.push(String(e)))
    await bootDocs(page)

    const doc = readFileSync(FIXTURE)
    await page.evaluate(async (base64) => {
      const bin = atob(base64)
      const bytes = new Uint8Array(bin.length)
      for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
      const url = URL.createObjectURL(new Blob([bytes]))
      const shim = window.desktop as unknown as Record<string, unknown>
      shim.openDocx = async () => ({
        path: 'host/browser-1/text-basic.doc',
        name: 'text-basic.doc',
        dataUrl: url,
        hash: 'test',
      })
      shim.confirmDocumentReplace = async () => true
    }, doc.toString('base64'))

    await page.getByRole('button', { name: '文件', exact: true }).click()
    await page.getByRole('button', { name: /打开/ }).first().click()

    const body = page.locator('.ProseMirror')
    await expect(body).toContainText('Legacy DOC text extraction', { timeout: 30_000 })
    await expect(body).toContainText('中文段落：混合中英文 ABC 测试。')
    await expect(page).toHaveTitle('text-basic.doc')
    expect(errors).toEqual([])
  })
})
