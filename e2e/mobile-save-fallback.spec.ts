import { expect, test } from '@playwright/test'

/**
 * Saving on a host with no save picker: the download fallback.
 *
 * Android Chrome and Android WebViews have no showSaveFilePicker, so before this
 * the user could edit a document and have nowhere to put the result — saveDocxAs
 * resolved to null and nothing was written. Refusing to save is the one outcome a
 * document editor must not produce.
 *
 * The fallback hands the bytes to the browser's download machinery. This asserts a
 * download actually starts, because "we called the code path" is not the same as
 * "the file left the app".
 */

const DOCS_URL = process.env.MOBILE_DOCS_URL ?? 'http://127.0.0.1:5199'

test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true })

test.describe('save without a picker', () => {
  test('saveDocxAs starts a real download instead of returning null', async ({ page }) => {
    // the state an Android browser is in: no File System Access pickers
    await page.addInitScript(() => {
      const w = window as unknown as Record<string, unknown>
      Object.defineProperty(w, 'showOpenFilePicker', { configurable: true, value: undefined })
      Object.defineProperty(w, 'showSaveFilePicker', { configurable: true, value: undefined })
    })

    await page.goto(DOCS_URL, { waitUntil: 'load' })
    await expect(page.locator('.ProseMirror')).toBeVisible({ timeout: 30_000 })

    // capture the download the page triggers
    const downloadPromise = page.waitForEvent('download', { timeout: 20_000 }).catch(() => null)

    const result = await page.evaluate(async () => {
      const d = window.desktop as unknown as Record<string, (...a: unknown[]) => Promise<unknown>>
      const bytes = new Uint8Array([0x50, 0x4b, 0x03, 0x04, 1, 2, 3])
      try {
        return { value: await d.saveDocxAs('host/browser-1/x.docx', bytes) }
      } catch (e) {
        return { threw: String(e).slice(0, 100) }
      }
    })

    const download = await downloadPromise

    test.info().annotations.push({
      type: 'fallback',
      description: 'result=' + JSON.stringify(result) + ' download=' + (download ? await download.suggestedFilename() : 'none'),
    })

    // the app must report a save it actually performed
    const value = (result as { value?: { path?: string; name?: string } | null }).value
    expect(value, 'saveDocxAs no longer resolves to null: ' + JSON.stringify(result)).toBeTruthy()
    expect(value!.name, 'the caller gets a usable file name').toBeTruthy()

    // and a download must have started — that is the bytes leaving the app
    expect(download, 'a download was triggered').not.toBeNull()
    expect(await download!.suggestedFilename(), 'the download carries the document name').toMatch(/\.docx$/)
  })

  test('with a picker present the picker is still preferred', async ({ page }) => {
    // a desktop-like host: the stub records that it was used
    await page.addInitScript(() => {
      const w = window as unknown as Record<string, unknown>
      const w2 = w as unknown as { __pickerUsed?: boolean }
      w2.__pickerUsed = false
      Object.defineProperty(w, 'showSaveFilePicker', {
        configurable: true,
        value: async () => {
          w2.__pickerUsed = true
          return {
            name: 'picked.docx',
            createWritable: async () => ({ write: async () => {}, close: async () => {} }),
          }
        },
      })
      Object.defineProperty(w, 'showOpenFilePicker', { configurable: true, value: async () => [] })
    })

    await page.goto(DOCS_URL, { waitUntil: 'load' })
    await expect(page.locator('.ProseMirror')).toBeVisible({ timeout: 30_000 })

    const used = await page.evaluate(async () => {
      const d = window.desktop as unknown as Record<string, (...a: unknown[]) => Promise<unknown>>
      await d.saveDocxAs('host/browser-1/x.docx', new Uint8Array([1, 2, 3]))
      return (window as unknown as { __pickerUsed?: boolean }).__pickerUsed === true
    })

    // the fallback must not shadow the real mechanism when it exists
    expect(used, 'the picker path was used when available').toBe(true)
  })
})
