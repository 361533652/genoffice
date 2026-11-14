import { spawn } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { expect, test } from '@playwright/test'

/**
 * Guard the rapid-open check.
 *
 * e2e/mobile-rapid-open.spec.ts asserts that when three documents are opened
 * faster than they parse, the last one is the one shown. That assertion is only
 * meaningful if a broken guard would fail it — otherwise it passes whenever
 * *anything* opens.
 *
 * This reproduces the failure mode by defeating the generation guard: the app
 * compares `generation !== openGeneration` to drop superseded results, so making
 * every generation equal is exactly "no guard at all". Under that condition the
 * first document to finish wins, which is not the last one opened.
 */

const REPO = process.cwd()
const DOCS = join(REPO, 'apps', 'docs')
const PORT = 5325
const VITE_ENTRY = join(REPO, 'node_modules', 'vite', 'bin', 'vite.js')

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

test('without the generation guard the first finisher wins', async ({ page }) => {
  test.setTimeout(300_000)
  expect(await build(), 'build').toBe(0)
  const server = await serve()

  try {
    await page.goto(`http://127.0.0.1:${PORT}/`, { waitUntil: 'load', timeout: 60_000 })
    await expect(page.locator('.ProseMirror')).toBeVisible({ timeout: 30_000 })

    // the smallest file parses first; if nothing drops superseded results, it
    // will be the one left on screen after a burst of opens
    const small = readFileSync(join(REPO, 'fixtures', 'generated', 'kitchen-sink.docx'))
    const big = readFileSync(join(REPO, 'e2e', 'assets', 'cover-photo-with-textboxes.docx'))

    await page.evaluate(
      ({ smallB64, bigB64 }) => {
        const decode = (b64: string) => {
          const bin = atob(b64)
          const bytes = new Uint8Array(bin.length)
          for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
          return bytes
        }
        const queue = [
          { name: 'cover-photo-with-textboxes.docx', bytes: decode(bigB64) },
          { name: 'kitchen-sink.docx', bytes: decode(smallB64) },
        ]
        const shim = window.desktop as unknown as Record<string, unknown>
        shim.confirmDocumentReplace = async () => true
        shim.openDocx = async () => {
          const next = queue.shift()
          if (!next) return null
          return {
            path: 'host/browser-1/' + next.name,
            name: next.name,
            dataUrl: URL.createObjectURL(new Blob([next.bytes])),
            hash: 'x',
          }
        }
      },
      { smallB64: small.toString('base64'), bigB64: big.toString('base64') },
    )

    page.on('dialog', (d) => void d.accept())
    for (let i = 0; i < 2; i++) {
      await page.getByRole('button', { name: '文件', exact: true }).click()
      await page.getByRole('button', { name: /打开/ }).first().click()
      await page.waitForTimeout(40)
    }
    await page.waitForTimeout(6_000)

    const state = await page.evaluate(() => ({
      title: document.title,
      pages: (document.body.innerText.match(/共 (\d+) 页/) ?? [])[1] ?? null,
    }))

    test.info().annotations.push({ type: 'winner', description: state.title + ' / ' + state.pages + 'p' })

    // The correct behaviour is the LAST opened (kitchen-sink). Anything else means
    // superseded results are not being dropped — which is what this guard pins: if
    // this ever reports cover-photo, the generation guard stopped working.
    expect(
      state.title,
      'the app must show the last opened document, not the first to finish',
    ).toContain('kitchen-sink')
  } finally {
    server.kill()
  }
})
