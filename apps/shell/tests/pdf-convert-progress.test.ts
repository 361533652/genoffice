import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

/**
 * A PDF conversion must not freeze the app.
 *
 * The pipeline is a long run of synchronous PDFium calls, and the shell drives
 * it from Electron's main process. Before this, the conversion blocked every
 * window until it finished and the progress it reported could never be painted
 * — the user saw a frozen app with no indicator at all.
 *
 * Two things keep that from happening, and both are easy to undo by accident:
 * the pipeline yields between pages, and the shell hands each tick to the
 * renderer instead of only to the taskbar.
 */

const root = join(import.meta.dirname, '../../..')
const read = (...parts: string[]) => readFileSync(join(root, ...parts), 'utf8')

describe('the conversion pipeline yields between pages', () => {
  const pipeline = read('packages/pdf2docx/src/pipeline.ts')

  it('is async and awaits the document-scoped runner', () => {
    expect(pipeline).toContain('export async function extractIrDocument')
    expect(pipeline).toContain('await withPdfDocumentAsync(')
  })

  it('hands the event loop back once per page in both passes', () => {
    // one in the extract loop, one in the analyze loop
    expect(pipeline.match(/await yieldToEventLoop\(\)/g)?.length ?? 0).toBe(2)
  })

  it('yields to a macrotask, not a microtask', () => {
    // a microtask runs before the event loop can paint, which would leave the
    // window frozen in exactly the way this is meant to prevent
    expect(pipeline).toMatch(/setImmediate\(resolve\)/)
  })

  it('reports which pass a tick belongs to', () => {
    expect(pipeline).toContain("'extract'")
    expect(pipeline).toContain("'analyze'")
  })
})

describe('withPdfDocumentAsync keeps the document open', () => {
  const pdfium = read('packages/pdf2docx/src/extract/pdfium.ts')

  it('awaits the callback before the finally closes the document', () => {
    // returning fn(doc) without awaiting would free the document while the
    // queued work still needed it
    expect(pdfium).toContain('return await fn(doc)')
  })

  it('still closes and frees on every path', () => {
    const body = pdfium.slice(pdfium.indexOf('export async function withPdfDocumentAsync'))
    expect(body).toContain('_FPDF_CloseDocument(doc)')
    expect(body).toMatch(/finally/)
  })
})

describe('the shell surfaces conversion progress to the renderer', () => {
  const shell = read('apps/shell/src/main/index.ts')

  it('sends a tick on the pdf channel', () => {
    expect(shell).toContain("'pdf:convert-progress'")
  })

  it('keeps the taskbar bar working too', () => {
    expect(shell).toContain('host.setProgressBar(')
  })
})

describe('the pdf window shows the progress', () => {
  const app = read('apps/pdf/src/renderer/App.tsx')
  const styles = read('apps/pdf/src/renderer/styles.css')

  it('subscribes to the ticks and clears them when the conversion ends', () => {
    expect(app).toContain('window.pdfApi.onConvertProgress?.(')
    expect(app).toContain('setConvertProgress(null)')
  })

  it('splits the bar across the two passes so it never runs backwards', () => {
    // extract fills 0-50%, analyze 50-100%
    expect(app).toMatch(/phase === 'extract' \? 0 : 50/)
  })

  it('renders an overlay that is not a dismissable dialog', () => {
    expect(app).toContain('className="convert-overlay"')
    expect(styles).toContain('.convert-overlay')
    // above the app's menus (z-index 60) and every dialog
    expect(styles).toMatch(/\.convert-overlay\s*\{[^}]*z-index:\s*200/s)
  })
})
