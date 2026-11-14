import { spawn } from 'node:child_process'
import { join } from 'node:path'
import { expect, test } from '@playwright/test'

/**
 * Booting on a bad connection — against the production bundle.
 *
 * A phone opens documents on 3G, in a lift, on hotel wifi. The first version of
 * this test ran against the dev server and timed out at 120s on every app: the dev
 * server serves a few thousand unbundled modules, and at 400kbps that is minutes
 * of round trips. That is a property of the dev server, not of the app, so the
 * measurement has to run against built output — the same rule that applied to the
 * performance baseline.
 *
 * A slow network should make the app slower, not broken. What this catches is a
 * dynamic import whose rejection escapes, or a font load that fails the boot.
 */

const REPO = process.cwd()
const DOCS = join(REPO, 'apps', 'docs')
const PORT = 5321
const VITE_ENTRY = join(REPO, 'node_modules', 'vite', 'bin', 'vite.js')

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

async function serve(): Promise<ReturnType<typeof spawn>> {
  const child = spawn(
    process.execPath,
    [VITE_ENTRY, 'preview', '--config', 'vite.renderer.config.ts', '--host', '127.0.0.1', '--port', String(PORT)],
    { cwd: DOCS, stdio: 'ignore' },
  )
  for (let i = 0; i < 80; i++) {
    await new Promise((r) => setTimeout(r, 250))
    try {
      if ((await fetch(`http://127.0.0.1:${PORT}/`)).ok) return child
    } catch {
      /* not up yet */
    }
  }
  child.kill()
  throw new Error('preview did not start')
}

test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true })

test.describe('a slow connection', () => {
  test('the built app still boots at ~400kbps', async ({ page, context }) => {
    test.setTimeout(300_000)
    expect(await build(), 'build').toBe(0)
    const server = await serve()

    try {
      const cdp = await context.newCDPSession(page)
      await cdp.send('Network.enable')
      await cdp.send('Network.emulateNetworkConditions', {
        offline: false,
        latency: 300,
        downloadThroughput: (400 * 1024) / 8,
        uploadThroughput: (400 * 1024) / 8,
      })

      const errors: string[] = []
      page.on('pageerror', (e) => errors.push(String(e)))

      const started = Date.now()
      await page.goto(`http://127.0.0.1:${PORT}/`, { waitUntil: 'load', timeout: 240_000 })
      await page.waitForTimeout(6_000)
      const elapsed = Date.now() - started

      const state = await page.evaluate(() => ({
        text: document.body.innerText.trim().length,
        rootChildren: document.getElementById('root')?.children.length ?? 0,
        lang: document.documentElement.lang,
      }))

      // slower is expected; blank is not
      expect(state.rootChildren, 'nothing rendered on a slow link').toBeGreaterThan(0)
      expect(state.text, 'the UI rendered on a slow link').toBeGreaterThanOrEqual(4)
      expect(state.lang).toMatch(/^[a-z]{2}/)
      expect(errors, 'slow network produced a page error: ' + (errors[0] ?? '')).toEqual([])

      test.info().annotations.push({
        type: 'boot-time',
        description: elapsed + 'ms on ~400kbps/300ms (production bundle)',
      })
    } finally {
      server.kill()
    }
  })
})
