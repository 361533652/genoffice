import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { expect, test, type Page } from '@playwright/test'

/**
 * Engine fidelity on a mobile host: open a real document inside the browser
 * and save it back, with no Electron preload — the environment the Android
 * WebView host provides.
 *
 * This is the load-bearing assumption behind the "full editor, not a cut-down
 * viewer" decision. Two different guarantees are asserted, because the two
 * engines save differently:
 *
 *  - docx patches the original package, so an unchanged document must come
 *    back byte-identical (SHA-256 match).
 *  - pptx rebuilds the package from its parsed model, so bytes differ; what
 *    must hold is that the rebuilt deck re-opens with the same slides and the
 *    same shape count per slide.
 */

const DOCS_URL = process.env.MOBILE_DOCS_URL ?? 'http://127.0.0.1:5199'
const REPO = process.cwd()

/** Vite serves out-of-root files under `/@fs/<absolute posix path>`. */
function engineEntry(pkg: string): string {
  return '/@fs/' + join(REPO, 'packages', pkg, 'src', 'index.ts').replace(/\\/g, '/')
}

async function bootDocs(page: Page): Promise<void> {
  await page.goto(DOCS_URL, { waitUntil: 'load' })
  await expect(page.locator('.ProseMirror')).toBeVisible({ timeout: 30_000 })
}

/** Install the Browser-side Node globals the engines assume (`Buffer`). */
async function installGlobals(page: Page): Promise<void> {
  await page.evaluate(async (entry) => {
    const mod = await import(entry)
    await mod.installNodeGlobals()
  }, '/@fs/' + join(REPO, 'packages', 'host', 'src', 'node-globals.ts').replace(/\\/g, '/'))
}

test.describe('docx round-trip on a mobile host', () => {
  for (const name of ['simple.docx', 'kitchen-sink.docx']) {
    test(`${name} saves back byte-identical`, async ({ page }) => {
      await bootDocs(page)
      const bytes = readFileSync(join(REPO, 'fixtures', 'generated', name))
      const result = await roundTripDocx(page, bytes.toString('base64'))
      expect(result.ok, result.error ?? '').toBe(true)
      expect(result.savedLen, 'length').toBe(result.originalLen)
      expect(result.savedHash, 'sha256').toBe(result.originalHash)
      expect(result.identical, 'bytes').toBe(true)
    })
  }
})

test.describe('pptx round-trip on a mobile host', () => {
  test('a rebuilt deck re-opens with the same slides and shapes', async ({ page }) => {
    await bootDocs(page)
    await installGlobals(page)
    const bytes = readFileSync(
      join(REPO, 'packages', 'pptx-engine', 'tests', 'fixtures', '01_standard_business.pptx'),
    )
    const result = await page.evaluate(
      async ({ base64, entry }) => {
        const bin = atob(base64)
        const data = new Uint8Array(bin.length)
        for (let i = 0; i < bin.length; i++) data[i] = bin.charCodeAt(i)
        const eng = await import(entry)
        const opened = await eng.openPptx(data)
        const saved = new Uint8Array(await eng.savePptx(opened))
        const reopened = await eng.openPptx(saved)
        const shapeCounts = (deck: { slides?: { elements?: unknown[]; shapes?: unknown[] }[] }) =>
          (deck.slides ?? []).map((s) => (s.elements ?? s.shapes ?? []).length)
        return {
          ok: true,
          originalSlides: opened.deck.slides?.length ?? -1,
          savedSlides: reopened.deck.slides?.length ?? -1,
          originalShapes: shapeCounts(opened.deck),
          savedShapes: shapeCounts(reopened.deck),
        }
      },
      { base64: bytes.toString('base64'), entry: engineEntry('pptx-engine') },
    )
    expect(result.ok).toBe(true)
    expect(result.savedSlides).toBe(result.originalSlides)
    expect(result.savedShapes).toEqual(result.originalShapes)
  })

  test('the engine imports with no node: built-in', async ({ page }) => {
    // the machine-level point: `node:crypto` used to break this import in a
    // WebView, so a bare dynamic import is the regression test
    await bootDocs(page)
    await installGlobals(page)
    const ok = await page.evaluate(async (entry) => {
      const mod = await import(entry)
      return typeof mod.openPptx === 'function' && typeof mod.savePptx === 'function'
    }, engineEntry('pptx-engine'))
    expect(ok).toBe(true)
  })
})

test.describe('docx engine on a mobile host', () => {
  test('exports the parse/save pair without a node: built-in', async ({ page }) => {
    await bootDocs(page)
    const probe = await page.evaluate(async (entry) => {
      const mod = await import(entry)
      return { exports: Object.keys(mod).length, hasParse: typeof mod.parseDocx === 'function' }
    }, engineEntry('docx-engine'))
    expect(probe.hasParse).toBe(true)
    expect(probe.exports).toBeGreaterThan(20)
  })
})

interface DocxRoundTrip {
  ok: boolean
  error?: string
  originalLen: number
  savedLen: number
  originalHash: string
  savedHash: string
  identical: boolean
}

/** Parse bytes, rebuild the unmodified block list, save, and hash both sides. */
async function roundTripDocx(page: Page, base64: string): Promise<DocxRoundTrip> {
  return page.evaluate(
    async ({ base64, entry }) => {
      const bin = atob(base64)
      const bytes = new Uint8Array(bin.length)
      for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)

      const eng = await import(entry)
      const parsed = await eng.parseDocx(bytes)
      // "unchanged" means every visible original block stays an original block
      const blocks = parsed.blocks
        .filter((b: { hidden?: boolean }) => !b.hidden)
        .map((b: { docxIndex: number }) => ({ kind: 'original', docxIndex: b.docxIndex }))
      const saved = new Uint8Array(await eng.saveDocx(parsed, blocks))

      let identical = saved.length === bytes.length
      if (identical) {
        for (let i = 0; i < bytes.length; i++) {
          if (bytes[i] !== saved[i]) {
            identical = false
            break
          }
        }
      }
      const sha = async (b: Uint8Array): Promise<string> =>
        Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', b)))
          .map((x) => x.toString(16).padStart(2, '0'))
          .join('')

      return {
        ok: true,
        originalLen: bytes.length,
        savedLen: saved.length,
        originalHash: await sha(bytes),
        savedHash: await sha(saved),
        identical,
      }
    },
    { base64, entry: engineEntry('docx-engine') },
  )
}
