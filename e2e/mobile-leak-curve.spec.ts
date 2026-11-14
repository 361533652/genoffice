import { spawn } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { expect, test } from '@playwright/test'

/**
 * Is the per-open growth a cache or a leak?
 *
 * The first measurement of this path found 31MB -> 40MB over four open/close
 * cycles: about 2.3MB per cycle. That is small enough to be a cache (the parser's
 * font table, the document's decoded images kept warm for the next open) and large
 * enough to be a leak. One measurement cannot tell them apart.
 *
 * A cache plateaus; a leak keeps climbing. This runs twice as many cycles and
 * compares the two halves: if the second half grows as much as the first, nothing
 * is being reused and it is a leak.
 */

const REPO = process.cwd()
const DOCS = join(REPO, 'apps', 'docs')
const PORT = 5323
const VITE_ENTRY = join(REPO, 'node_modules', 'vite', 'bin', 'vite.js')
const FIXTURE = join(REPO, 'e2e', 'assets', 'cover-photo-with-textboxes.docx')

function build(): Promise<number> {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, [VITE_ENTRY, 'build', '--config', 'vite.renderer.config.ts'], {
      cwd: DOCS,
      stdio: 'ignore',
    })
    child.on('error', () => resolve(1))
    child.on('close', (code) => resolve(code ?? 0))
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
      /* not up */
    }
  }
  child.kill()
  throw new Error('preview did not start')
}

test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true })

test.describe('repeated opens', () => {
  test('growth plateaus, which means cache rather than leak', async ({ page }) => {
    test.setTimeout(900_000)
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
        const shim = window.desktop as unknown as Record<string, unknown>
        shim.openDocx = async () => {
          const copy = new Uint8Array(bytes)
          return {
            path: 'host/browser-1/cover.docx',
            name: 'cover.docx',
            dataUrl: URL.createObjectURL(new Blob([copy])),
            hash: 'x',
          }
        }
        shim.confirmDocumentReplace = async () => true
      }, docx.toString('base64'))

      const heapMB = async (): Promise<number | null> =>
        page.evaluate(() => {
          const mem = (performance as unknown as { memory?: { usedJSHeapSize: number } }).memory
          return mem ? Math.round(mem.usedJSHeapSize / (1024 * 1024)) : null
        })

      const openOnce = async (): Promise<void> => {
        page.once('dialog', (d) => void d.accept())
        await page.getByRole('button', { name: '文件', exact: true }).click()
        await page.getByRole('button', { name: /打开/ }).first().click()
        await expect(page.locator('body')).toContainText(/共 \d+ 页/, { timeout: 60_000 })
        await page.waitForTimeout(1_000)
      }

      // two warm-ups: first-open costs (fonts, workers, parser tables) are one-off
      await openOnce()
      await openOnce()
      const start = await heapMB()

      for (let i = 0; i < 4; i++) await openOnce()
      const mid = await heapMB()

      for (let i = 0; i < 4; i++) await openOnce()
      const end = await heapMB()

      if (start === null || mid === null || end === null) {
        test.skip(true, 'performance.memory unavailable')
        return
      }

      const firstHalf = mid - start
      const secondHalf = end - mid
      test.info().annotations.push({
        type: 'heap-curve',
        description: `${start} -> ${mid} -> ${end} MB (halves: +${firstHalf}, +${secondHalf})`,
      })

      // A cache fills once: the second half must not keep growing at the same rate.
      // Allow absolute noise of a few MB, since GC timing moves the number around.
      if (firstHalf > 5) {
        expect(
          secondHalf,
          `still climbing: +${firstHalf}MB then +${secondHalf}MB — that is a leak, not a cache`,
        ).toBeLessThan(Math.max(firstHalf, 5) + 5)
      }
      // and the total must stay sane for a phone either way
      expect(end - start, 'total growth over 8 cycles').toBeLessThan(200)
    } finally {
      server.kill()
    }
  })
})
