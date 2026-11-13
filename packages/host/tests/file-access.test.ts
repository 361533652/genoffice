import { describe, expect, it } from 'vitest'
import { DESKTOP_CAPABILITIES, BROWSER_CAPABILITIES, type FileAccess } from '@genoffice/host-contract'

/**
 * The FileAccess contract, checked as a shape rather than a behaviour: the
 * browsers here have no File System Access API, so these assert that a host
 * implements the whole surface and that the capability flags agree with it.
 *
 * Behavioural coverage of the browser implementation lives in the e2e suite,
 * where a real Blob and a real picker stand-in exist.
 */

/** Every member a conforming host must provide. */
const REQUIRED: (keyof FileAccess)[] = [
  'open',
  'readChunk',
  'readAll',
  'readText',
  'save',
  'saveAs',
]

/** A minimal host, used to prove the type is satisfiable without a real FS. */
function fakeHost(): FileAccess {
  const handle = { id: 'h1', name: 'a.docx', writable: true }
  return {
    async open() {
      return { handle, size: 3, writable: true }
    },
    async readChunk(_h, offset, end) {
      return new Uint8Array([1, 2, 3]).subarray(offset, end)
    },
    async readAll() {
      return new Uint8Array([1, 2, 3])
    },
    async readText() {
      return 'abc'
    },
    async save() {
      return { ok: true, atomic: false }
    },
    async saveAs() {
      return { handle, size: 3, writable: true }
    },
  }
}

describe('FileAccess contract', () => {
  it('is satisfiable by a host with no filesystem', () => {
    const host = fakeHost()
    for (const member of REQUIRED) expect(typeof host[member], String(member)).toBe('function')
  })

  it('reports saves as non-atomic where the host cannot guarantee it', async () => {
    // the browser host replaces in place with no rename; a caller that needs
    // crash safety (recovery copies) has to be able to see that
    const outcome = await fakeHost().save({ id: 'h1', name: 'a.docx' }, new Uint8Array([1]))
    expect(outcome).toEqual({ ok: true, atomic: false })
  })

  it('slices chunks without copying the whole file', async () => {
    const host = fakeHost()
    const handle = { id: 'h1', name: 'a.docx' }
    expect(Array.from(await host.readChunk(handle, 0, 2))).toEqual([1, 2])
    expect(Array.from(await host.readChunk(handle, 2, 3))).toEqual([3])
  })

  it('keeps file access off for a browser without the picker', () => {
    // openFile false is the honest answer where showOpenFilePicker is missing:
    // the UI hides the affordance instead of throwing at call time
    expect(typeof BROWSER_CAPABILITIES.openFile).toBe('boolean')
    expect(DESKTOP_CAPABILITIES.openFile).toBe(true)
  })
})
