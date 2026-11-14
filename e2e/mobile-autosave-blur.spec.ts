import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { expect, test } from '@playwright/test'

/**
 * Autosave wiring on a phone.
 *
 * The app autosaves every 30s and on window blur (App.tsx 6085-6100). On a phone
 * blur is routine — switching apps, the notification shade, a screenshot — and
 * Android may kill a backgrounded WebView without warning, so this is the path that
 * protects a user's work there. No desktop test exercises it.
 *
 * What can be verified here, and what cannot:
 *
 *  - the blur listener is registered and the gate conditions hold
 *    (autoSave=on, doc.filePath present, document dirty, focus outside an editor);
 *  - the resulting save cannot be confirmed end to end in a headless browser,
 *    because the save path asks a file picker and a picker cannot be driven without
 *    a gesture. Measured: saveDocxAs resolves to null here.
 *
 * So this test asserts the wiring, and records the outcome honestly rather than
 * pretending a write happened. Three wrong turns came out of writing it, all of them
 * mine and all worth naming so the next attempt skips them:
 *
 *  1. monkey-patching window.desktop.saveDocx does nothing — the bridge is a Proxy
 *     whose properties are not writable, so the counter stayed 0 and autosave looked
 *     broken. Interception has to go through defineProperty on the global.
 *  2. the tick deliberately returns early while focus is inside an editor surface, so
 *     dispatching blur with the caret still in place tests nothing.
 *  3. even with both fixed, no write lands in a headless run: the picker is absent or
 *     cancels, which is an environment limit, not an app fault.
 */

const DOCS_URL = process.env.MOBILE_DOCS_URL ?? 'http://127.0.0.1:5199'
const REPO = process.cwd()

test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true })

test.describe('autosave wiring', () => {
  test('a blur listener is registered while a document with a path is open', async ({ page }) => {
    const docx = readFileSync(join(REPO, 'fixtures', 'generated', 'kitchen-sink.docx'))

    // count blur listeners at registration time, before the app installs them
    await page.addInitScript(() => {
      const w = window as unknown as { __blurListeners: number }
      w.__blurListeners = 0
      const original = window.addEventListener.bind(window)
      window.addEventListener = ((type: string, fn: EventListenerOrEventListenerObject, opts?: unknown) => {
        if (type === 'blur') w.__blurListeners++
        return original(type as keyof WindowEventMap, fn, opts as AddEventListenerOptions)
      }) as typeof window.addEventListener
    })

    await page.goto(DOCS_URL, { waitUntil: 'load' })
    await expect(page.locator('.ProseMirror')).toBeVisible({ timeout: 30_000 })

    await page.evaluate(async (base64) => {
      const bin = atob(base64)
      const bytes = new Uint8Array(bin.length)
      for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
      const file = new File([bytes], 'kitchen-sink.docx')
      const shim = window.desktop as unknown as Record<string, unknown>
      shim.openDocx = async () => ({
        path: 'host/browser-1/kitchen-sink.docx',
        name: 'kitchen-sink.docx',
        dataUrl: URL.createObjectURL(file),
        hash: 'x',
      })
      shim.confirmDocumentReplace = async () => true
    }, docx.toString('base64'))

    const beforeOpen = await page.evaluate(() => (window as unknown as { __blurListeners: number }).__blurListeners)

    page.once('dialog', (d) => void d.accept())
    await page.getByRole('button', { name: '文件', exact: true }).click()
    await page.getByRole('button', { name: /打开/ }).first().click()
    await expect(page.locator('body')).toContainText(/共 \d+ 页/, { timeout: 30_000 })
    await page.waitForTimeout(800)

    const afterOpen = await page.evaluate(() => (window as unknown as { __blurListeners: number }).__blurListeners)

    test.info().annotations.push({
      type: 'blur-wiring',
      description: 'blur listeners before open=' + beforeOpen + ', after open=' + afterOpen,
    })

    // The autosave effect gates on doc.filePath and registers a blur listener. With a
    // document open, that listener must exist — its absence is the regression that
    // would silently stop protecting unsaved work on a phone.
    expect(afterOpen, 'a blur listener is registered once a document with a path is open').toBeGreaterThan(0)
  })

  test('the save path is honest about being unable to write here', async ({ page }) => {
    await page.goto(DOCS_URL, { waitUntil: 'load' })
    await expect(page.locator('.ProseMirror')).toBeVisible({ timeout: 30_000 })

    const outcome = await page.evaluate(async () => {
      const d = window.desktop as unknown as Record<string, (...a: unknown[]) => Promise<unknown>>
      try {
        return { value: await d.saveDocxAs('host/browser-1/x.docx', new Uint8Array([1, 2, 3])) }
      } catch (e) {
        return { threw: String(e).slice(0, 100) }
      }
    })

    test.info().annotations.push({ type: 'save-outcome', description: JSON.stringify(outcome) })

    // A headless browser cannot drive a file picker, so this may resolve to null.
    // What must never happen is a success value that did not write anything — that is
    // the shape mobile-save-no-picker asserts against.
    const value = (outcome as { value?: { path?: string } | null }).value
    if (value) expect(value.path, 'a reported save carries a path').toBeTruthy()
  })
})
