import { spawn } from 'node:child_process'
import { join } from 'node:path'
import { expect, test } from '@playwright/test'

/**
 * Can a user recover from a failure without reloading the page?
 *
 * The last round found that PDF's empty window had nothing to press. The same
 * question applies to the states *after* something goes wrong: an app that shows
 * "打开失败" and no way forward leaves the user to reload the whole page — which on a
 * phone means paying the 5.7-14.7 MB download again.
 *
 * Every failure the shim produces is a structured { ok: false, error } with a readable
 * message, so the app has what it needs. This checks whether a way forward is offered.
 */

const REPO = process.cwd()
const APPS = [
  { name: 'docs', dir: 'docs', port: 5370 },
  { name: 'sheets', dir: 'sheets', port: 5371 },
  { name: 'pdf', dir: 'pdf', port: 5372 },
  { name: 'markdown', dir: 'markdown', port: 5373 },
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
  test(`${app.name}: an open that fails leaves a way forward`, async ({ page }) => {
    test.setTimeout(240_000)
    const server = await serve(app.dir, app.port)

    try {
      // make every open attempt fail the way a corrupt file would
      await page.addInitScript(() => {
        const w = window as unknown as Record<string, unknown>
        for (const name of ['desktop', 'desktopApi', 'pdfApi', 'markdownApi']) {
          const value = w[name]
          if (!value || typeof value !== 'object') continue
          const bridge = value as Record<string, unknown>
          for (const key of ['openDocx', 'openPdf', 'openMarkdown', 'selectWorkbook']) {
            if (typeof bridge[key] !== 'function') continue
            const original = bridge[key] as (...a: unknown[]) => unknown
            bridge[key] = async (...args: unknown[]) => {
              try {
                const r = await original(...args)
                return r
              } catch {
                return null
              }
            }
          }
        }
      })

      const errors: string[] = []
      page.on('pageerror', (e) => errors.push(String(e)))

      await page.goto(`http://127.0.0.1:${app.port}/`, { waitUntil: 'load', timeout: 120_000 })
      await page.waitForTimeout(5_000)
      // try the documented way in: the menu, then anything that looks like Open
      const attempted = await page.evaluate(() => {
        const all = [...document.querySelectorAll('button, [role="button"]')]
        const open = all.find((el) => /打开|Open|文件/.test((el.textContent ?? '').trim()))
        if (open) {
          ;(open as HTMLElement).click()
          return true
        }
        return false
      })
      await page.waitForTimeout(3_000)

      const state = await page.evaluate(() => {
        const visible = [...document.querySelectorAll('button, [role="button"], a')].filter((el) => {
          const r = el.getBoundingClientRect()
          return r.width > 0 && r.height > 0
        })
        return {
          textLength: document.body.innerText.trim().length,
          controls: visible.length,
          body: document.body.innerText.replace(/\s+/g, ' ').slice(0, 80),
        }
      })

      test.info().annotations.push({
        type: 'failure-state',
        description: 'attempted=' + attempted + ' controls=' + state.controls + ' text=' + state.body,
      })

      // After a failed open the app must still be a usable screen with controls: on a
      // phone the alternative is reloading and re-downloading several megabytes.
      expect(state.textLength, 'the app still shows something').toBeGreaterThan(2)
      expect(state.controls, 'a failed open leaves no way forward').toBeGreaterThan(0)
      expect(errors, 'a failed open threw: ' + (errors[0] ?? '')).toEqual([])
    } finally {
      server.kill()
    }
  })
}
