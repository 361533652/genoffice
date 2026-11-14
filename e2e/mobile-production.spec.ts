import { spawn } from 'node:child_process'
import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { expect, test } from '@playwright/test'

/**
 * The production build, not just the dev server.
 *
 * Everything else in this suite runs against Vite's dev server, which resolves
 * bare specifiers through its own module graph and injects polyfills on demand.
 * A production bundle resolves everything at build time and inlines only what it
 * traced — so "works in dev" does not imply "works in a WebView", and the
 * Android host ships the built output.
 *
 * This builds apps/docs, serves dist/ on a private port, and loads it with no
 * preload. It is self-contained: no external preview process to remember.
 */

const REPO = process.cwd()
const DOCS = join(REPO, 'apps', 'docs')
const PORT = 5311
// Windows cannot spawn a .cmd without a shell, so run vite's JS entry with node
const VITE_ENTRY = join(REPO, 'node_modules', 'vite', 'bin', 'vite.js')

/** Build the app; returns the exit code. */
function build(): Promise<number> {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, [VITE_ENTRY, 'build', '--config', 'vite.renderer.config.ts'], {
      cwd: DOCS,
      stdio: 'ignore',
    })
    child.on('error', () => resolve(1))
    child.on('close', (code) => resolve(code ?? 1))
  })
}

/** Serve dist/ and wait until the port answers. */
async function serve(): Promise<ReturnType<typeof spawn>> {
  const child = spawn(
    process.execPath,
    [VITE_ENTRY, 'preview', '--config', 'vite.renderer.config.ts', '--host', '127.0.0.1', '--port', String(PORT)],
    { cwd: DOCS, stdio: 'ignore' },
  )
  for (let i = 0; i < 60; i++) {
    await new Promise((r) => setTimeout(r, 250))
    try {
      if ((await fetch(`http://127.0.0.1:${PORT}/`)).ok) return child
    } catch {
      /* not up yet */
    }
  }
  child.kill()
  throw new Error('preview did not start on ' + PORT)
}

test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true })

test.describe('production bundle on a mobile host', () => {
  test('the built renderer mounts with no preload', async ({ page }) => {
    test.setTimeout(240_000)
    expect(existsSync(VITE_ENTRY), 'vite entry').toBe(true)
    expect(await build(), 'build exit code').toBe(0)

    const server = await serve()
    try {
      const errors: string[] = []
      page.on('pageerror', (e) => errors.push(String(e)))

      await page.goto(`http://127.0.0.1:${PORT}/`, { waitUntil: 'load', timeout: 60_000 })
      await expect(page.locator('.ProseMirror')).toBeVisible({ timeout: 30_000 })
      await page.waitForTimeout(1_500)

      const state = await page.evaluate(() => ({
        lang: document.documentElement.lang,
        innerWidth: window.innerWidth,
        scrollWidth: document.documentElement.scrollWidth,
        text: document.body.innerText.length,
      }))

      // a bundle that failed to trace a dependency typically white-screens here
      expect(state.text, 'the UI rendered').toBeGreaterThan(50)
      expect(state.lang).toMatch(/^[a-z]{2}(-[A-Z]{2})?$/)
      expect(state.innerWidth).toBe(390)
      expect(state.scrollWidth).toBeLessThanOrEqual(390)
      expect(errors, 'no page errors from the built bundle').toEqual([])
    } finally {
      server.kill()
    }
  })
})
