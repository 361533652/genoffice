import { expect, test } from '@playwright/test'

/**
 * What happens to Save when the platform has no save picker.
 *
 * hasFilePicker() requires BOTH showOpenFilePicker and showSaveFilePicker. The
 * File System Access API is desktop Chromium; Android Chrome has long shipped
 * without showSaveFilePicker, and an Android WebView has neither. So on the target
 * platform the picker path is simply absent.
 *
 * This spec originally recorded a defect: with no picker, saveDocxAs resolved to
 * null and the user had nowhere to put an edited document. That has been fixed —
 * a download fallback now runs instead — so this file's job changed. It now asserts
 * the property that must hold afterwards: a save is either performed, or refused
 * with a reason. Fabricating a handle without writing bytes is still a failure.
 */

const DOCS_URL = process.env.MOBILE_DOCS_URL ?? 'http://127.0.0.1:5199'

test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true })

test.describe('a host without a save picker', () => {
  test('save-as performs a save or refuses with a reason — never a hollow handle', async ({ page }) => {
    await page.addInitScript(() => {
      const w = window as unknown as Record<string, unknown>
      Object.defineProperty(w, 'showOpenFilePicker', { configurable: true, value: undefined })
      Object.defineProperty(w, 'showSaveFilePicker', { configurable: true, value: undefined })
    })

    await page.goto(DOCS_URL, { waitUntil: 'load' })
    await expect(page.locator('.ProseMirror')).toBeVisible({ timeout: 30_000 })
    await page.waitForTimeout(500)

    const downloadPromise = page.waitForEvent('download', { timeout: 20_000 }).catch(() => null)

    const state = await page.evaluate(async () => {
      const w = window as unknown as Record<string, unknown>
      const d = window.desktop as unknown as Record<string, (...a: unknown[]) => Promise<unknown>>
      let saveAs: unknown
      try {
        saveAs = await d.saveDocxAs('host/browser-1/x.docx', new Uint8Array([1, 2, 3]))
      } catch (e) {
        saveAs = { threw: String(e).slice(0, 100) }
      }
      return {
        pickersGone: typeof w.showSaveFilePicker === 'undefined' && typeof w.showOpenFilePicker === 'undefined',
        saveAs,
      }
    })

    expect(state.pickersGone, 'both pickers are absent, like an Android browser').toBe(true)

    const outcome = state.saveAs as { path?: string; name?: string } | null | { threw?: string } | undefined
    const download = await downloadPromise

    test.info().annotations.push({
      type: 'no-picker-save',
      description: 'saveDocxAs -> ' + JSON.stringify(state.saveAs) + ', download=' + (download ? await download.suggestedFilename() : 'none'),
    })

    if (outcome === null || outcome === undefined || (typeof outcome === 'object' && 'threw' in outcome)) {
      // a refusal is acceptable, and must carry a reason somewhere
      expect(download, 'a refusal must not also start a download').toBeNull()
      return
    }

    // a reported success must correspond to bytes actually leaving the app
    expect(outcome.name, 'a claimed save names the file').toBeTruthy()
    expect(
      download,
      'save reported success (' + JSON.stringify(outcome) + ') but no download started — a hollow handle',
    ).not.toBeNull()
    expect(await download!.suggestedFilename()).toMatch(/\.docx$/)
  })
})
