import { spawn } from 'node:child_process'
import { join } from 'node:path'
import { expect, test } from '@playwright/test'

/**
 * Typing into the blank document a phone opens with.
 *
 * docs boots with an empty document rather than an empty screen, so a first-time user
 * can start typing without opening anything. That is a deliberate design and it has
 * never been tested: every other spec injects a file first.
 *
 * What makes this worth a test rather than an assumption: the blank document is
 * created by the shim (blankDocxBytes), not by the engine reading a real file, and a
 * document built that way could easily lack the focus target or the editable state
 * that a parsed one has.
 */

const REPO = process.cwd()
const PORT = 5354
const VITE_ENTRY = join(REPO, 'node_modules', 'vite', 'bin', 'vite.js')

async function serve(dir: string, port: number): Promise<ReturnType<typeof spawn>> {
  const child = spawn(
    process.execPath,
    [VITE_ENTRY, 'preview', '--config', 'vite.renderer.config.ts', '--host', '127.0.0.1', '--port', String(port)],
    { cwd: join(REPO, 'apps', dir), stdio: 'ignore' },
  )
  for (let i = 0; i < 80; i++) {
    await new Promise((r) => setTimeout(r, 250))
    try {
      if ((await fetch(`http://127.0.0.1:${port}/`)).ok) return child
    } catch {
      /* not up */
    }
  }
  child.kill()
  throw new Error('preview did not start')
}

test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true })

test.describe('the blank document a first-time user gets', () => {
  test('accepts typing without opening anything', async ({ page }) => {
    test.setTimeout(240_000)
    const server = await serve('docs', PORT)
    try {
      const errors: string[] = []
      page.on('pageerror', (e) => errors.push(String(e)))

      await page.goto(`http://127.0.0.1:${PORT}/`, { waitUntil: 'load', timeout: 120_000 })
      await expect(page.locator('.ProseMirror')).toBeVisible({ timeout: 60_000 })

      const editable = await page.evaluate(() => {
        const el = document.querySelector('.ProseMirror')
        return {
          contentEditable: el?.getAttribute('contenteditable'),
          text: (el?.textContent ?? '').trim(),
        }
      })
      test.info().annotations.push({ type: 'blank', description: JSON.stringify(editable) })

      // a blank document that is not editable is a dead end: the user sees a page and
      // cannot type on it
      expect(editable.contentEditable, 'the blank page is editable').toBe('true')

      await page.locator('.ProseMirror').first().click()
      await expect
        .poll(() => page.evaluate(() => !!document.activeElement?.closest('.ProseMirror')), {
          timeout: 30_000,
          message: 'the blank document took focus',
        })
        .toBe(true)

      await page.keyboard.type('first words', { delay: 60 })
      await expect
        .poll(
          () =>
            page.evaluate(() =>
              [...document.querySelectorAll('.ProseMirror')].some((e) =>
                (e.textContent ?? '').includes('first words'),
              ),
            ),
          { timeout: 60_000, message: 'the typed text landed in the blank document' },
        )
        .toBe(true)

      expect(errors, 'typing into a blank document threw: ' + (errors[0] ?? '')).toEqual([])
    } finally {
      server.kill()
    }
  })
})
