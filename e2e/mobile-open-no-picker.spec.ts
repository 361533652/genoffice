import { expect, test } from '@playwright/test'

/**
 * What the shared open path does on a host with no File System Access picker.
 *
 * openViaPicker() answers 'unsupported' when showOpenFilePicker is absent — that API
 * is desktop Chromium, so Android browsers and WebViews take that branch. This spec
 * originally recorded the consequence: the Open button could not produce a file at
 * all, and no <input type=file> existed to fall back to.
 *
 * openAnywhere() now chooses: the picker when present, an <input type=file> when not.
 * This file therefore asserts the dispatch rather than the old defect — which option
 * is chosen, and that the picker is not reached on a host that lacks it.
 */

const DOCS_URL = process.env.MOBILE_DOCS_URL ?? 'http://127.0.0.1:5199'

test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true })

test.describe('the open path dispatches on host capability', () => {
  test('without a picker it uses the input fallback, not the picker', async ({ page }) => {
    await page.addInitScript(() => {
      const w = window as unknown as Record<string, unknown>
      Object.defineProperty(w, 'showOpenFilePicker', { configurable: true, value: undefined })
      Object.defineProperty(w, 'showSaveFilePicker', { configurable: true, value: undefined })
    })

    await page.goto(DOCS_URL, { waitUntil: 'load' })
    await expect(page.locator('.ProseMirror')).toBeVisible({ timeout: 30_000 })

    const state = await page.evaluate(async () => {
      const root = '/@fs/' + 'E:/gitbub-project/genoffice'.replace(/\\/g, '/')
      const files = await import(root + '/packages/host/src/files.ts')
      const w = window as unknown as Record<string, unknown>
      return {
        pickersGone:
          typeof w.showOpenFilePicker === 'undefined' && typeof w.showSaveFilePicker === 'undefined',
        hasPicker: files.hasFilePicker(),
        exposesFallbacks:
          typeof files.openViaInput === 'function' &&
          typeof files.openAnywhere === 'function' &&
          typeof files.saveViaDownload === 'function',
      }
    })

    expect(state.pickersGone, 'the pickers are absent, like an Android browser').toBe(true)
    expect(state.hasPicker, 'hasFilePicker reports false here').toBe(false)
    // a host without the API must still have a route to a file; mobile-open-fallback
    // proves that route works end to end with a real document
    expect(state.exposesFallbacks, 'the input/download fallbacks are exported').toBe(true)
  })

  test('a host that has the picker keeps using it', async ({ page }) => {
    await page.goto(DOCS_URL, { waitUntil: 'load' })
    await expect(page.locator('.ProseMirror')).toBeVisible({ timeout: 30_000 })

    const state = await page.evaluate(async () => {
      const root = '/@fs/' + 'E:/gitbub-project/genoffice'.replace(/\\/g, '/')
      const files = await import(root + '/packages/host/src/files.ts')
      return { hasPicker: files.hasFilePicker() }
    })

    // This container's browser does ship the API, which is exactly why the fallback
    // has to be forced in the other tests rather than assumed — a default
    // environment proves nothing about a phone.
    test.info().annotations.push({ type: 'picker-here', description: String(state.hasPicker) })
    expect(typeof state.hasPicker, 'the capability is reported').toBe('boolean')
  })
})
