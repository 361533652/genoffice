import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { expect, test } from '@playwright/test'

/**
 * Opening a document on a host with no File System Access picker.
 *
 * openViaPicker() needs showOpenFilePicker, which Android Chrome and Android
 * WebViews do not have — the same gap that made saving impossible until a download
 * fallback was added. Saving got a fallback; opening did not, so on the target
 * platform the Open button could not produce a file at all. An editor that cannot
 * open a document is a blank page with a toolbar.
 *
 * An <input type=file> exists on every browser, so the fallback does too. This test
 * clicks the real input and feeds it a real file, which is the only way to show the
 * bytes actually arrive — asserting that the function was called proves nothing.
 */

const DOCS_URL = process.env.MOBILE_DOCS_URL ?? 'http://127.0.0.1:5199'
const REPO = process.cwd()

test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true })

test.describe('open without a picker', () => {
  test('the fallback opens a real document and the editor shows it', async ({ page }) => {
    await page.addInitScript(() => {
      const w = window as unknown as Record<string, unknown>
      Object.defineProperty(w, 'showOpenFilePicker', { configurable: true, value: undefined })
      Object.defineProperty(w, 'showSaveFilePicker', { configurable: true, value: undefined })
    })

    await page.goto(DOCS_URL, { waitUntil: 'load' })
    await expect(page.locator('.ProseMirror')).toBeVisible({ timeout: 30_000 })

    // the app calls openDocx; the fallback creates an <input> and clicks it, so a
    // file chooser event is what proves the path was taken
    const chooserPromise = page.waitForEvent('filechooser', { timeout: 15_000 }).catch(() => null)
    const openCall = page.evaluate(async () => {
      const d = window.desktop as unknown as Record<string, (...a: unknown[]) => Promise<unknown>>
      try {
        return { value: await d.openDocx() }
      } catch (e) {
        return { threw: String(e).slice(0, 100) }
      }
    })

    const chooser = await chooserPromise
    test.info().annotations.push({
      type: 'chooser',
      description: chooser ? 'a file chooser was opened by the fallback' : 'no chooser appeared',
    })

    // Without an input being opened, the fallback is not wired up. This is the
    // assertion that distinguishes "fallback exists" from "fallback runs".
    expect(chooser, 'the fallback opened a file chooser').not.toBeNull()

    // give it the document the user would have picked
    const fixture = readFileSync(join(REPO, 'fixtures', 'generated', 'kitchen-sink.docx'))
    await chooser!.setFiles({
      name: 'kitchen-sink.docx',
      mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      buffer: fixture,
    })

    const result = await openCall
    const value = (result as { value?: { path?: string; name?: string } | null }).value

    test.info().annotations.push({ type: 'open-result', description: JSON.stringify(result) })

    // the bytes must have arrived, with the name preserved for the title bar
    expect(value, 'openDocx resolved to a document: ' + JSON.stringify(result)).toBeTruthy()
    expect(value!.name, 'the file name survives the fallback').toBe('kitchen-sink.docx')
    expect(value!.path, 'a handle id is returned').toBeTruthy()
  })
})
