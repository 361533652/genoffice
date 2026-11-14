import { expect, test } from '@playwright/test'

/**
 * slides on a mobile host: the deck session runs on the pure-TS pptx stack.
 *
 * The app boots into a blank deck (newBlank), the Konva canvas paints, and the
 * bridge's edit/save path works end to end: add a text box, edit it, save to a
 * download, reopen the saved bytes and find the edit. Canvas content has no
 * DOM text, so the read-back goes through the session host's model (the same
 * data layer the renderer draws from).
 */

const SLIDES_URL = process.env.MOBILE_SLIDES_URL ?? 'http://127.0.0.1:5202'

test('a deck opens, edits and saves through the deck session', async ({ page }) => {
  test.setTimeout(180_000)
  const errors: string[] = []
  const consoleLines: string[] = []
  page.on('pageerror', (e) => errors.push(String(e.stack ?? e)))
  page.on('console', (msg) => {
    if (msg.type() === 'error' || msg.type() === 'warning') consoleLines.push(`[${msg.type()}] ${msg.text()}`)
  })
  page.on('dialog', (d) => void d.accept())

  await page.addInitScript(() => {
    const w = window as unknown as Record<string, unknown>
    // the Android shape: neither picker exists
    Object.defineProperty(w, 'showOpenFilePicker', { configurable: true, value: undefined })
    Object.defineProperty(w, 'showSaveFilePicker', { configurable: true, value: undefined })
    w.__genofficeSlidesSession = true
  })

  await page.goto(SLIDES_URL, { waitUntil: 'load' })
  await page.waitForFunction(
    () => (window as unknown as { __genofficeSlidesSessionReady?: boolean }).__genofficeSlidesSessionReady === true,
    null,
    { timeout: 30_000 },
  )
  // the app boots into a blank deck: the Konva canvas paints
  try {
    await expect(page.locator('.ribbon, [class*="ribbon"]').first()).toBeVisible({ timeout: 30_000 })
  } catch (error) {
    throw new Error(`ribbon never appeared.\npageerrors:\n${errors.join('\n')}\nconsole:\n${consoleLines.join('\n')}`)
  }
  await page.waitForFunction(() => document.querySelectorAll('canvas').length > 0, null, { timeout: 30_000 })

  // ── edit through the bridge (the canvas has no DOM text to type into) ──
  const added = await page.evaluate(async () => {
    const api = (window as unknown as Record<string, unknown>).slidesApi as Record<
      string,
      (...args: unknown[]) => Promise<unknown>
    >
    const result = (await api.addElement({
      slideIndex: 0,
      fitWidthPx: 800,
      kind: 'text',
      xPx: 120,
      yPx: 120,
      wPx: 320,
      hPx: 90,
      text: 'HelloSlides',
    })) as { sourceId: string } | null
    return result?.sourceId ?? null
  })
  expect(added).toBeTruthy()

  const edited = await page.evaluate(async (sourceId: string) => {
    const api = (window as unknown as Record<string, unknown>).slidesApi as Record<
      string,
      (...args: unknown[]) => Promise<unknown>
    >
    const r = await api.editText({
      slideIndex: 0,
      sourceId,
      paragraphs: [{ runs: [{ text: 'EditedOnMobile' }] }],
    })
    return r !== null
  }, added!)
  expect(edited).toBe(true)

  // ── save: no writable handle on this host, so it degrades to a download ──
  const [download] = await Promise.all([
    page.waitForEvent('download', { timeout: 60_000 }),
    page.evaluate(async () => {
      const api = (window as unknown as Record<string, unknown>).slidesApi as Record<
        string,
        (...args: unknown[]) => Promise<unknown>
      >
      await api.save()
    }),
  ])
  const savedPath = await download.path()
  expect(savedPath).toBeTruthy()

  // ── reopen the saved bytes in the live session and read the edit back ──
  // (file:// is not fetchable from the page, so the test hands the bytes over)
  const { readFileSync } = await import('node:fs')
  const bytes = readFileSync(savedPath!)
  const reopened = await page.evaluate(async (b64: string) => {
    const host = (window as unknown as {
      __genofficeSlidesSessionHost: {
        openBytes: (bytes: Uint8Array, handle: unknown, fitWidthPx: number) => Promise<unknown>
        opened: { deck: { slides: { elements: { text?: { paragraphs: { runs: { text: string }[] }[] } }[] }[] } } | null
      }
    }).__genofficeSlidesSessionHost
    const bin = atob(b64)
    const arr = new Uint8Array(bin.length)
    for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i)
    await host.openBytes(arr, { id: 'e2e-reopen/deck.pptx', name: 'deck.pptx', writable: false }, 800)
    const slide = host.opened!.deck.slides[0]!
    for (const el of slide.elements) {
      const text = el.text
      if (text?.paragraphs?.length) {
        const joined = text.paragraphs.map((p) => p.runs.map((r) => r.text).join('')).join('\n')
        if (joined.includes('EditedOnMobile')) return joined
      }
    }
    return null
  }, bytes.toString('base64'))
  expect(reopened).toContain('EditedOnMobile')
  expect(errors).toEqual([])
})
