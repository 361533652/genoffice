import { spawn } from 'node:child_process'
import { join } from 'node:path'
import { expect, test } from '@playwright/test'

/**
 * What a phone actually downloads, measured from the production bundle.
 *
 * The earlier slow-network test reported ~40s to first paint at 400kbps. That number
 * was measured against an older build, and the bundle sizes say why it is worth
 * re-checking on the current one:
 *
 *   sheets  main chunk 20.3 MB   (+ CJK font subsets)
 *   docs    main chunk  8.5 MB   (+ 2.7 MB + 2.0 MB of Noto CJK subsets)
 *
 * A 20 MB entry chunk is the single biggest thing between a phone and a usable
 * spreadsheet, and it is invisible in every test that runs against localhost.
 *
 * This records what actually crosses the wire before the app is interactive. It
 * asserts only that the app arrives; the number is the finding.
 */

const REPO = process.cwd()
const APPS = [
  { name: 'docs', dir: 'docs', port: 5340 },
  { name: 'sheets', dir: 'sheets', port: 5341 },
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
  test(`${app.name}: what crosses the wire before it is interactive`, async ({ page }) => {
    test.setTimeout(300_000)
    const server = await serve(app.dir, app.port)

    try {
      let bytes = 0
      const seen: Array<{ url: string; size: number }> = []
      page.on('response', async (res) => {
        try {
          const header = res.headers()['content-length']
          const len = header ? Number(header) : (await res.body()).length
          if (Number.isFinite(len) && len > 0) {
            bytes += len
            seen.push({ url: res.url(), size: len })
          }
        } catch {
          /* body unavailable (redirect, stream) */
        }
      })

      await page.goto(`http://127.0.0.1:${app.port}/`, { waitUntil: 'load', timeout: 180_000 })
      await page.waitForTimeout(4_000)

      const biggest = seen.sort((a, b) => b.size - a.size).slice(0, 4).map((s) => {
        const file = s.url.split('/').pop() ?? s.url
        return file + ' ' + (s.size / (1024 * 1024)).toFixed(2) + 'MB'
      })

      test.info().annotations.push({
        type: 'wire',
        description: `${(bytes / (1024 * 1024)).toFixed(1)} MB over ${seen.length} responses; biggest: ${biggest.join(', ')}`,
      })

      // the app must still be usable, however heavy it is
      const rendered = await page.evaluate(() => document.body.innerText.trim().length)
      expect(rendered, 'the app rendered').toBeGreaterThan(4)
      expect(bytes, 'something was downloaded').toBeGreaterThan(0)
    } finally {
      server.kill()
    }
  })
}
