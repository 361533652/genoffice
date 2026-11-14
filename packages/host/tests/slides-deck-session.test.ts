/**
 * The deck session host, end to end over the real pptx engine stack.
 *
 * Proof that slides' desktop session semantics run on a mobile host: create a
 * deck, add a text box, edit its text, save, reopen the saved bytes and find
 * the edit — plus undo/redo and the slide structural ops. No Electron, no
 * Node filesystem: the same pure-TS packages a WebView bundles.
 */
import { describe, expect, test } from 'vitest'
import type { FileHandle, FileHost, OpenResult } from '@genoffice/host-contract'
import { DeckSessionHost } from '../src/slides/deck-session.js'
import { createDeckMethods } from '../src/slides/methods.js'

/** An in-memory FileHost: handles are keys, saves land in a map. */
function memoryFileHost(): { files: FileHost; saved: Map<string, Uint8Array> } {
  const saved = new Map<string, Uint8Array>()
  let counter = 0
  const handle = (name: string): FileHandle => ({
    id: `mem-${++counter}/${name}`,
    name,
    writable: true,
  })
  const files: FileHost = {
    open: async (): Promise<OpenResult> => ({ ok: false, reason: 'canceled' }),
    saveAs: async (data, name): Promise<OpenResult> => {
      const h = handle(name)
      saved.set(h.id, new Uint8Array(data))
      return { ok: true, handle: h, data }
    },
    saveInPlace: async (h, data) => {
      saved.set(h.id, new Uint8Array(data))
      return { ok: true }
    },
    read: async (h) => saved.get(h.id) ?? null,
    rename: async () => ({ ok: false, error: 'not needed in tests' }),
  }
  return { files, saved }
}

type Methods = ReturnType<typeof createDeckMethods>

function setup(): { host: DeckSessionHost; methods: Methods; saved: Map<string, Uint8Array> } {
  const { files, saved } = memoryFileHost()
  const host = new DeckSessionHost(files)
  const methods = createDeckMethods(host, files)
  return { host, methods, saved }
}

/** The text of the first text-bearing element on a slide (model-level truth). */
function firstText(host: DeckSessionHost, slideIndex = 0): string {
  const slide = host.opened!.deck.slides[slideIndex]!
  for (const el of slide.elements) {
    const text = (el as { text?: { paragraphs: { runs: { text: string }[] }[] } }).text
    if (text?.paragraphs?.length) {
      return text.paragraphs.map((p) => p.runs.map((r) => r.text).join('')).join('\n')
    }
  }
  return ''
}

describe('deck session over the pptx engine stack', () => {
  test('newBlank renders a deck; addElement + editText land in the model', async () => {
    const { host, methods } = setup()
    const opened = (await methods.newBlank(800)) as { path: string; slides: unknown[]; size: { cx: number; cy: number } }
    expect(opened.slides.length).toBe(1)
    expect(opened.size.cx).toBeGreaterThan(0)

    const added = (await methods.addElement({
      slideIndex: 0,
      fitWidthPx: 800,
      kind: 'text',
      xPx: 100,
      yPx: 100,
      wPx: 300,
      hPx: 80,
      text: 'hello mobile',
    })) as { slide: unknown; sourceId: string }
    expect(added.sourceId).toBeTruthy()
    expect(firstText(host)).toContain('hello mobile')

    const updated = await methods.editText({
      slideIndex: 0,
      sourceId: added.sourceId,
      paragraphs: [{ runs: [{ text: 'edited on device' }] }],
    })
    expect(updated).not.toBeNull()
    expect(firstText(host)).toContain('edited on device')
    expect(host.isDirty()).toBe(true)
  }, 60_000)

  test('a text edit survives save and reopen (byte round-trip)', async () => {
    const { host, methods, saved } = setup()
    await methods.newBlank(800)
    const added = (await methods.addElement({
      slideIndex: 0,
      fitWidthPx: 800,
      kind: 'text',
      xPx: 100,
      yPx: 100,
      wPx: 300,
      hPx: 80,
      text: 'roundtrip',
    })) as { sourceId: string }
    await methods.editText({
      slideIndex: 0,
      sourceId: added.sourceId,
      paragraphs: [{ runs: [{ text: 'saved-and-reopened' }] }],
    })

    const result = (await methods.save()) as { ok: boolean; path: string; slides: unknown[] }
    expect(result.ok).toBe(true)
    expect(result.slides.length).toBe(1)
    const bytes = [...saved.values()][0]
    expect(bytes).toBeDefined()
    expect(bytes!.byteLength).toBeGreaterThan(1000)

    // reopen the saved bytes in a fresh session
    const second = setup()
    await second.host.openBytes(bytes!, { id: 'reopen/deck.pptx', name: 'deck.pptx', writable: true }, 800)
    expect(firstText(second.host)).toContain('saved-and-reopened')
  }, 60_000)

  test('undo and redo restore the deck state', async () => {
    const { host, methods } = setup()
    await methods.newBlank(800)
    const added = (await methods.addElement({
      slideIndex: 0,
      fitWidthPx: 800,
      kind: 'text',
      xPx: 100,
      yPx: 100,
      wPx: 300,
      hPx: 80,
      text: 'before',
    })) as { sourceId: string }
    await methods.editText({
      slideIndex: 0,
      sourceId: added.sourceId,
      paragraphs: [{ runs: [{ text: 'after' }] }],
    })
    expect(firstText(host)).toContain('after')

    const undone = (await methods.undo()) as unknown[] | null
    expect(undone).not.toBeNull()
    expect(firstText(host)).toContain('before')

    const redone = (await methods.redo()) as unknown[] | null
    expect(redone).not.toBeNull()
    expect(firstText(host)).toContain('after')
  }, 60_000)

  test('slide structural ops: add, duplicate, move, delete', async () => {
    const { host, methods } = setup()
    await methods.newBlank(800)
    expect(host.opened!.deck.slides.length).toBe(1)

    const added = (await methods.addBlankSlide({ sourceIndex: 0, fitWidthPx: 800 })) as { index: number; order: string[] }
    expect(added.index).toBe(1)
    expect(host.opened!.deck.slides.length).toBe(2)

    const dup = (await methods.duplicateSlides({ slideIndexes: [0], fitWidthPx: 800 })) as { index: number }
    expect(dup.index).toBe(1)
    expect(host.opened!.deck.slides.length).toBe(3)

    const moved = (await methods.moveSlide({ fromIndex: 0, toIndex: 2 })) as { order: string[] }
    expect(moved.order.length).toBe(3)

    const deleted = (await methods.deleteSlide(0)) as { order: string[] }
    expect(deleted.order.length).toBe(2)
    expect(host.opened!.deck.slides.length).toBe(2)
  }, 60_000)

  test('applyTxn runs a raw op transaction with the autofit pass', async () => {
    const { host, methods } = setup()
    await methods.newBlank(800)
    const added = (await methods.addElement({
      slideIndex: 0,
      fitWidthPx: 800,
      kind: 'text',
      xPx: 100,
      yPx: 100,
      wPx: 300,
      hPx: 80,
      text: 'txn',
    })) as { sourceId: string }

    const result = (await methods.applyTxn({
      ops: [
        {
          op: 'setText',
          target: { slide: 0, el: added.sourceId },
          paragraphs: [{ runs: [{ text: 'via transaction' }] }],
        },
      ],
    })) as { applied: boolean; slides: unknown[] }
    expect(result.applied).toBe(true)
    expect(result.slides.length).toBe(1)
    expect(firstText(host)).toContain('via transaction')

    const dry = (await methods.applyTxn({
      ops: [{ op: 'setText', target: { slide: 0, el: 'missing-element' }, paragraphs: [] }],
      dryRun: true,
    })) as { applied: boolean; dryRun: boolean; failures?: unknown[] }
    expect(dry.applied).toBe(false)
    expect(dry.dryRun).toBe(true)
    expect(dry.failures?.length).toBeGreaterThan(0)
  }, 60_000)

  test('notes and comments ride the archive and survive save', async () => {
    const { host, methods, saved } = setup()
    await methods.newBlank(800)
    expect(await methods.setNotes({ slideIndex: 0, text: 'speaker notes here' })).toBe(true)
    expect(await methods.getNotes(0)).toContain('speaker notes here')
    const comments = (await methods.addComment({ slideIndex: 0, text: 'a comment' })) as unknown[]
    expect(comments.length).toBe(1)

    const result = (await methods.save()) as { ok: boolean }
    expect(result.ok).toBe(true)
    const bytes = [...saved.values()][0]!
    const second = setup()
    await second.host.openBytes(bytes, { id: 'reopen/deck.pptx', name: 'deck.pptx', writable: true }, 800)
    expect(await second.methods.getNotes(0)).toContain('speaker notes here')
    expect(((await second.methods.getComments(0)) as unknown[]).length).toBe(1)
  }, 60_000)
})
