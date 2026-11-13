import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { expect, test } from '@playwright/test'

/**
 * FileAccess: the single contract a renderer uses instead of the dozen
 * per-app file APIs (`openDocx`, `openPdf`, `openMarkdown`, `readFile`,
 * `readFileChunk`, `saveDocx`...), each of which carries a filesystem path that
 * a browser cannot honour and Android SAF cannot supply.
 *
 * This exercises the browser implementation end to end against a real File:
 * open, read in chunks, read whole, read text, and save. It runs in a renderer
 * with no preload, which is the Android WebView environment.
 *
 * The picker cannot be driven headlessly, so the test installs the File the
 * picker would have returned; everything after that point is the real code.
 */

const DOCS_URL = process.env.MOBILE_DOCS_URL ?? 'http://127.0.0.1:5199'
const REPO = process.cwd()

test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true })

test.describe('file access contract on a mobile host', () => {
  test('reads a real document in chunks and whole', async ({ page }) => {
    await page.goto(DOCS_URL, { waitUntil: 'load' })
    await expect(page.locator('.ProseMirror')).toBeVisible({ timeout: 30_000 })

    const docx = readFileSync(join(REPO, 'fixtures', 'generated', 'simple.docx'))
    const result = await page.evaluate(async (base64) => {
      const entry = '/@fs/' + 'E:/gitbub-project/genoffice'.replace(/\\/g, '/') + '/packages/host/src/index.ts'
      const host = await import(entry)

      const bin = atob(base64)
      const bytes = new Uint8Array(bin.length)
      for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
      const file = new File([bytes], 'simple.docx')

      // stand in for the picker, registering the File the user would have chosen
      host.grantBrowserFile(file, 'test-handle')
      const handle = { id: 'test-handle', name: 'simple.docx', writable: true }

      const access = host.createBrowserFileAccess()
      const whole = await access.readAll(handle)
      const first = await access.readChunk(handle, 0, 4)
      const tail = await access.readChunk(handle, whole.byteLength - 4, whole.byteLength)

      return {
        size: whole.byteLength,
        firstBytes: Array.from(first),
        tailBytes: Array.from(tail),
        // a .docx is a ZIP: 50 4b 03 04
        hasZipMagic: first[0] === 0x50 && first[1] === 0x4b,
        chunkRejoined: first.byteLength + tail.byteLength <= whole.byteLength,
      }
    }, docx.toString('base64'))

    expect(result.size).toBe(docx.byteLength)
    expect(result.hasZipMagic).toBe(true)
    expect(result.firstBytes).toHaveLength(4)
    expect(result.tailBytes).toHaveLength(4)
    expect(result.chunkRejoined).toBe(true)
  })

  test('reads a text document and refuses to rewrite a granted File in place', async ({ page }) => {
    await page.goto(DOCS_URL, { waitUntil: 'load' })
    await expect(page.locator('.ProseMirror')).toBeVisible({ timeout: 30_000 })

    const result = await page.evaluate(async () => {
      const entry = '/@fs/' + 'E:/gitbub-project/genoffice'.replace(/\\/g, '/') + '/packages/host/src/index.ts'
      const host = await import(entry)

      const text = '# 标题\n\n正文段落。'
      const file = new File([text], 'note.md', { type: 'text/markdown' })
      host.grantBrowserFile(file, 'text-handle')
      const handle = { id: 'text-handle', name: 'note.md', writable: true }

      const access = host.createBrowserFileAccess()
      const read = await access.readText(handle)
      const saved = await access.save(handle, new TextEncoder().encode('rewritten'))
      return { read, ok: saved.ok, reason: saved.ok ? null : saved.reason }
    })

    expect(result.read).toBe('# 标题\n\n正文段落。')
    // A File the host was handed is a read-only snapshot: there is nowhere to
    // write it back to. Saying so is the point — a silent success here would
    // tell the app its save worked when nothing was stored. Overwriting needs a
    // destination the user picked, i.e. saveAs.
    expect(result.ok).toBe(false)
    expect(result.reason).toBe('error')
  })

  test('reports a handle it does not hold instead of returning junk', async ({ page }) => {
    await page.goto(DOCS_URL, { waitUntil: 'load' })
    await expect(page.locator('.ProseMirror')).toBeVisible({ timeout: 30_000 })

    const message = await page.evaluate(async () => {
      const entry = '/@fs/' + 'E:/gitbub-project/genoffice'.replace(/\\/g, '/') + '/packages/host/src/index.ts'
      const host = await import(entry)
      const access = host.createBrowserFileAccess()
      try {
        await access.readAll({ id: 'never-granted', name: 'x.docx' })
        return 'no error'
      } catch (error) {
        return String(error)
      }
    })
    // a clear failure beats silently reading the wrong bytes
    expect(message).toContain('not readable')
  })
})
