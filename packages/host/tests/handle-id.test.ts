
import { describe, expect, it, beforeEach } from 'vitest'
import { grantFile, rawFileFor } from '../src/files.js'

/**
 * Handle ids carry a display name as their last segment.
 *
 * The renderers derive a filename by splitting a "path" on a separator
 * (`filePath.split(/[\\/]/).pop()`), and several do it before any
 * handle-aware code runs. A bare id like `granted-3` therefore surfaced in the
 * title bar as the literal text "granted-3" — a real defect found while working
 * through path de-parameterisation.
 *
 * The id stays opaque; only that last segment is meaningful, which is also what
 * an Android SAF document name will be.
 */
describe('handle ids', () => {
  let counter = 0
  beforeEach(() => {
    counter = 0
  })

  it('ends with the file name so existing basename call sites still work', () => {
    const file = new File([new Uint8Array([1])], 'quarterly-report.docx')
    const id = grantFile(file)
    // this is exactly what the renderers do
    const displayed = id.split(/[\\/]/).pop()
    expect(displayed).toBe('quarterly-report.docx')
  })

  it('stays unique across two files with the same name', () => {
    const a = grantFile(new File([new Uint8Array([1])], 'same.docx'))
    const b = grantFile(new File([new Uint8Array([2])], 'same.docx'))
    expect(a).not.toBe(b)
    expect(a.split(/[\\/]/).pop()).toBe('same.docx')
    expect(b.split(/[\\/]/).pop()).toBe('same.docx')
  })

  it('resolves back to the file it was granted for', () => {
    const file = new File(['hello'], 'note.md')
    const id = grantFile(file)
    expect(rawFileFor(id)).toBe(file)
  })

  it('keeps an explicitly supplied id for hosts that already have one', () => {
    // a SAF host will hand over something like content://…/report.docx
    const file = new File(['x'], 'report.docx')
    const id = grantFile(file, 'content://provider/documents/report.docx')
    expect(id).toBe('content://provider/documents/report.docx')
    expect(id.split(/[\\/]/).pop()).toBe('report.docx')
  })
})
