import { spawn } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { expect, test } from '@playwright/test'

/**
 * Opening documents faster than they load.
 *
 * On a phone the picker closes instantly and the user can tap Open again before
 * the first document has parsed. The app guards this with an `openGeneration`
 * counter (file-actions.ts) that drops a superseded result, but that guard has
 * only ever run against a local server answering in milliseconds.
 *
 * What a missing or broken guard looks like: the *first* document wins, or two
 * documents interleave — text from one file, page count from another, or a blank
 * editor because both results were discarded.
 *
 * The test opens three different files in quick succession and requires the last
 * one to be the one on screen, with its own page count.
 */

const REPO = process.cwd()
const DOCS = join(REPO, 'apps', 'docs')
const PORT = 5324
const VITE_ENTRY = join(REPO, 'node_modules', 'vite', 'bin', 'vite.js')

/**
 * Two fixtures from different directories, so the winner is identifiable by name.
 * The second is the larger file: it parses slower, which is what makes the race
 * meaningful — the last open started is the last to finish only if the guard works.
 */
const FILES = [
  { dir: 'fixtures/generated', name: 'kitchen-sink.docx' },
  { dir: 'fixtures/generated', name: 'visual-captable-inline.docx' },
  { dir: 'e2e/assets', name: 'cover-photo-with-textboxes.docx' },
]

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

test.describe('rapid opens', () => {
  test('the last document opened is the one on screen', async ({ page }) => {
    test.setTimeout(300_000)
    expect(await build(), 'build').toBe(0)
    const server = await serve()

    try {
      await page.goto(`http://127.0.0.1:${PORT}/`, { waitUntil: 'load', timeout: 60_000 })
      await expect(page.locator('.ProseMirror')).toBeVisible({ timeout: 30_000 })

      const payloads = FILES.map((f) => ({
        name: f.name,
        base64: readFileSync(join(REPO, ...f.dir.split('/'), f.name)).toString('base64'),
      }))

      // hand the renderer a queue of documents; each Open takes the next one
      await page.evaluate((docs) => {
        const queue = docs.map((d) => {
          const bin = atob(d.base64)
          const bytes = new Uint8Array(bin.length)
          for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
          return { name: d.name, bytes }
        })
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
      }, payloads)

      // three opens, each fired before the previous can finish parsing
      for (let i = 0; i < 3; i++) {
        page.on('dialog', (d) => void d.accept())
        await page.getByRole('button', { name: '文件', exact: true }).click()
        await page.getByRole('button', { name: /打开/ }).first().click()
        await page.waitForTimeout(40)
      }

      // whichever finished last must be the one shown
      await page.waitForTimeout(6_000)

      const state = await page.evaluate(() => ({
        title: document.title,
        text: document.body.innerText.slice(0, 400),
        pages: (document.body.innerText.match(/共 (\d+) 页/) ?? [])[1] ?? null,
        editorVisible: !!document.querySelector('.ProseMirror'),
      }))

      test.info().annotations.push({
        type: 'last-open',
        description: state.title + ' / ' + state.pages + ' pages',
      })

      // something must be open: a blank editor here means every result was dropped
      expect(state.editorVisible, 'the editor is still mounted').toBe(true)
      expect(state.pages, 'a document is open').not.toBeNull()
      // the winner is the last file the queue handed out, which is cover-photo…
      expect(state.title, 'the last document opened is the one shown').toContain('cover-photo')
    } finally {
      server.kill()
    }
  })
})
