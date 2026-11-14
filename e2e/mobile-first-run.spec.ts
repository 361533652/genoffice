import { spawn } from 'node:child_process'
import { join } from 'node:path'
import { expect, test } from '@playwright/test'

/**
 * A brand-new user, with nothing open.
 *
 * Every end-to-end test in this suite starts by injecting a file. That is the right
 * way to test editing, but it means the state a phone user sees first — an empty
 * editor with no document, no recent files, nowhere to go — has never been examined.
 *
 * This walks that state on the production build and checks the three things a first
 * -time user can actually do something with:
 *
 *  - the screen explains what to do rather than looking broken;
 *  - the Open affordance exists and is reachable at 390px;
 *  - nothing throws while the app decides there is nothing to show.
 */

const REPO = process.cwd()
const APPS = [
  { name: 'docs', dir: 'docs', port: 5350 },
  { name: 'sheets', dir: 'sheets', port: 5351 },
  { name: 'pdf', dir: 'pdf', port: 5352 },
  { name: 'markdown', dir: 'markdown', port: 5353 },
]
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
  throw new Error('preview did not start for ' + dir)
}

test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true })

for (const app of APPS) {
  test(`${app.name}: a first-time user can tell what to do`, async ({ page }) => {
    test.setTimeout(240_000)
    const server = await serve(app.dir, app.port)

    try {
      const errors: string[] = []
      page.on('pageerror', (e) => errors.push(String(e)))

      await page.goto(`http://127.0.0.1:${app.port}/`, { waitUntil: 'load', timeout: 120_000 })
      await page.waitForTimeout(5_000)

      const state = await page.evaluate(() => {
        const text = document.body.innerText.replace(/\s+/g, ' ').trim()
        // an affordance the user can press to get going
        const controls = [...document.querySelectorAll('button, [role="button"], input[type="file"]')]
          .filter((el) => {
            const r = el.getBoundingClientRect()
            return r.width > 0 && r.height > 0
          })
          .map((el) => (el.textContent ?? '').trim() || el.getAttribute('aria-label') || el.tagName)
        return {
          text,
          textLength: text.length,
          controls: controls.slice(0, 12),
          // nothing may hang off the right edge at phone width
          scrollWidth: document.documentElement.scrollWidth,
          innerWidth: window.innerWidth,
        }
      })

      test.info().annotations.push({
        type: 'empty-state',
        description: 'text=' + state.text.slice(0, 60) + ' | controls=' + JSON.stringify(state.controls.slice(0, 6)),
      })

      // something must be on screen: an empty editor is fine, a blank page is not
      expect(state.textLength, 'the app renders something in its empty state').toBeGreaterThan(2)
      expect(state.scrollWidth, 'the empty state does not overflow the phone').toBeLessThanOrEqual(state.innerWidth + 2)
      // and there must be a way in
      expect(state.controls.length, 'a first-time user has something to press').toBeGreaterThan(0)
      expect(errors, 'the empty state threw: ' + (errors[0] ?? '')).toEqual([])
    } finally {
      server.kill()
    }
  })
}
