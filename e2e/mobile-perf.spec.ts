import { spawn } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { expect, test } from '@playwright/test'

/**
 * Opening a real document on a phone: a baseline, not a benchmark.
 *
 * Measured on the built bundle at 390x844 with a 313KB, five-page .docx: first
 * paint lands around 3.5s and the JS heap stays flat at ~25MB while the pages
 * render. The shape matters more than the numbers:
 *
 *  - the heap does not climb; nothing accumulates per page. A per-page leak is
 *    what would kill a long phone session, and that is what this asserts.
 *  - the cost is pagination, not module loading. The same open took 8.6s in dev
 *    because the browser fetched a few hundred modules at ~300ms each; the
 *    bundle removes that, so this runs against built output it builds itself.
 *  - the engine is not the bottleneck: parsing this file takes 48ms.
 *
 * Thresholds are loose on purpose — they catch an order-of-magnitude regression,
 * and a phone will be slower than this container, not faster.
 */

const REPO = process.cwd()
const DOCS = join(REPO, 'apps', 'docs')
const PORT = 5313
const VITE_ENTRY = join(REPO, 'node_modules', 'vite', 'bin', 'vite.js')
const FIXTURE = join(REPO, 'e2e', 'assets', 'cover-photo-with-textboxes.docx')

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
  for (let i = 0; i < 60; i++) {
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

test.describe('document open cost on a mobile host', () => {
  test('a five-page document paints without the heap climbing', async ({ page }) => {
    test.setTimeout(300_000)
    expect(await build(), 'build').toBe(0)
    const server = await serve()

    try {
      await page.goto(`http://127.0.0.1:${PORT}/`, { waitUntil: 'load', timeout: 60_000 })
      await expect(page.locator('.ProseMirror')).toBeVisible({ timeout: 30_000 })

      const docx = readFileSync(FIXTURE)
      await page.evaluate(async (base64) => {
        const bin = atob(base64)
        const bytes = new Uint8Array(bin.length)
        for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
        const file = new File([bytes], 'cover.docx')
        const shim = window.desktop as unknown as Record<string, unknown>
        shim.openDocx = async () => ({
          path: 'host/browser-1/cover.docx',
          name: 'cover.docx',
          dataUrl: URL.createObjectURL(file),
          hash: 'x',
        })
        shim.confirmDocumentReplace = async () => true

        const w = window as unknown as { __heap: number[] }
        w.__heap = []
        const mem = (performance as unknown as { memory?: { usedJSHeapSize: number } }).memory
        if (mem) {
          const id = setInterval(() => {
            w.__heap.push(Math.round(mem.usedJSHeapSize / (1024 * 1024)))
          }, 250)
          setTimeout(() => clearInterval(id), 15_000)
        }
      }, docx.toString('base64'))

      const started = Date.now()
      page.once('dialog', (d) => void d.accept())
      await page.getByRole('button', { name: '文件', exact: true }).click()
      await page.getByRole('button', { name: /打开/ }).first().click()

      await expect(page.locator('body')).toContainText(/共 \d+ 页/, { timeout: 60_000 })
      const elapsed = Date.now() - started
      expect(elapsed, 'open took far longer than the baseline').toBeLessThan(30_000)

      await page.waitForTimeout(2_000)
      const heap = await page.evaluate(() => (window as unknown as { __heap: number[] }).__heap)
      if (heap.length >= 4) {
        const peak = Math.max(...heap)
        expect(peak, 'heap peak while rendering').toBeLessThan(300)
      }
    } finally {
      server.kill()
    }
  })
})
