import { expect, test } from '@playwright/test'

/**
 * The text editors saving on a phone.
 *
 * markdown and html call their api's save({ text, mode }) and read ok/path back.
 * The shim answered { ok: false } with nothing else, on the reading that save is a
 * fire-and-forget dirty notification — but no renderer calls desktop.save(), while
 * these two await the answer. On a phone that meant editing a markdown file and
 * having no way to keep it, with no message saying why.
 *
 * The emulated host is the Android shape: no File System Access pickers. That is
 * the case these tests exist for; a desktop browser takes the picker path and this
 * suite already covers that in mobile-save-fallback.
 */

const APPS = [
  { name: 'markdown', port: 5204, api: 'markdownApi', ext: '.md' },
  { name: 'html', port: 5205, api: 'htmlApi', ext: '.html' },
]

test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true })

for (const app of APPS) {
  test(`${app.name}: save writes the document when no picker exists`, async ({ page }) => {
    await page.addInitScript(() => {
      const w = window as unknown as Record<string, unknown>
      Object.defineProperty(w, 'showOpenFilePicker', { configurable: true, value: undefined })
      Object.defineProperty(w, 'showSaveFilePicker', { configurable: true, value: undefined })
    })

    await page.goto(`http://127.0.0.1:${app.port}/`, { waitUntil: 'load' })
    await page.waitForTimeout(3_000)

    const downloadPromise = page.waitForEvent('download', { timeout: 20_000 }).catch(() => null)

    const result = await page.evaluate(
      async ({ apiName, ext }) => {
        const api = (window as unknown as Record<string, unknown>)[apiName] as Record<
          string,
          (...a: unknown[]) => Promise<unknown>
        >
        try {
          return {
            value: await api.save({
              text: '# hello\n\nwritten on a phone',
              imageSources: [],
              mode: 'saveAs',
              suggestedName: 'note' + ext,
            }),
          }
        } catch (e) {
          return { threw: String(e).slice(0, 120) }
        }
      },
      { apiName: app.api, ext: app.ext },
    )

    const download = await downloadPromise
    test.info().annotations.push({
      type: 'text-save',
      description: JSON.stringify(result) + ' download=' + (download ? await download.suggestedFilename() : 'none'),
    })

    const value = (result as { value?: { ok?: boolean; path?: string; error?: string } }).value
    expect(value, 'save answers: ' + JSON.stringify(result)).toBeDefined()
    // a reported success must mean bytes left the app
    if (value!.ok) {
      expect(value!.path, 'a successful save carries a path').toBeTruthy()
      expect(download, 'a successful save triggers a download').not.toBeNull()
      expect(await download!.suggestedFilename()).toMatch(new RegExp('\\' + app.ext + '$'))
    } else {
      // a refusal must explain itself; the old { ok: false } with no message cannot
      // be acted on by the user or by the app
      expect(value!.error, 'a refused save explains why').toBeTruthy()
    }
  })
}
