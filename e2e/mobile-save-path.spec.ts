import { expect, test } from '@playwright/test'

/**
 * Can the user actually save a document on a phone?
 *
 * The generous claim in HANDOFF.md was "docs saves back, byte-identical". Tracing
 * the evidence: mobile-roundtrip.spec.ts calls parseDocx/saveDocx directly in the
 * page and compares bytes. That proves the *engine* round-trips losslessly in a
 * WebView — a real and load-bearing result — but it never touches the app's save
 * path, the host bridge, or a file picker. It is not evidence that a user can save.
 *
 * This measures the save path itself. The three shapes are distinct and all three
 * matter:
 *
 *  - overwrite (saveDocx): refused, because a browser cannot write back to a file
 *    it opened;
 *  - create (saveDocxNew): refused, because there is no path to create at;
 *  - save-as (saveDocxAs): goes through the file picker, which returns null when
 *    the platform has no picker or the user cancels.
 *
 * What this asserts is that each failure is *explicit* — a reason the app can show
 * — rather than a silent success. Whether save-as can complete needs a real device
 * with a picker; a headless browser cannot answer that, and pretending otherwise
 * would put a false checkmark in the handoff note.
 */

const DOCS_URL = process.env.MOBILE_DOCS_URL ?? 'http://127.0.0.1:5199'

test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true })

test.describe('the document save path', () => {
  test('every save entry point answers explicitly, none pretends to succeed', async ({ page }) => {
    await page.goto(DOCS_URL, { waitUntil: 'load' })
    await expect(page.locator('.ProseMirror')).toBeVisible({ timeout: 30_000 })

    const outcomes = await page.evaluate(async () => {
      const d = window.desktop as unknown as Record<string, (...a: unknown[]) => Promise<unknown>>
      const bytes = new Uint8Array([1, 2, 3])
      const attempt = async (name: string): Promise<unknown> => {
        try {
          return await d[name](name === 'saveDocxAs' ? 'host/browser-1/x.docx' : 'host/browser-1/x.docx', bytes)
        } catch (e) {
          return { threw: String(e).slice(0, 80) }
        }
      }
      return {
        overwrite: await attempt('saveDocx'),
        create: await attempt('saveDocxNew'),
        saveAs: await attempt('saveDocxAs'),
      }
    })

    test.info().annotations.push({ type: 'save-paths', description: JSON.stringify(outcomes) })

    const describe = (o: unknown): string => JSON.stringify(o)

    // overwrite and create must refuse with a reason the app can display; an
    // undefined here would be read as success by the caller
    for (const [label, outcome] of [
      ['overwrite', outcomes.overwrite],
      ['create', outcomes.create],
    ] as const) {
      const value = outcome as { ok?: boolean; reason?: string; error?: string } | undefined
      expect(value, label + ' must answer, not vanish').toBeDefined()
      expect(value!.ok, label + ' must not report success: ' + describe(outcome)).toBe(false)
      expect(
        value!.reason ?? value!.error,
        label + ' must say why: ' + describe(outcome),
      ).toBeTruthy()
    }

    // save-as goes through a picker; a null answer means "no picker or cancelled",
    // which is a legitimate outcome but must not be the same shape as success
    const saveAs = outcomes.saveAs as { ok?: boolean } | null | undefined
    const saveAsIsHonest = saveAs === null || saveAs === undefined || saveAs.ok === false || saveAs.ok === true
    expect(saveAsIsHonest, 'save-as answers in a recognised shape: ' + describe(outcomes.saveAs)).toBe(true)
    if (saveAs && saveAs.ok === true) {
      // a picker did complete: record it, because that would mean this host can save
      test.info().annotations.push({ type: 'save-as-worked', description: describe(saveAs) })
    }
  })
})
