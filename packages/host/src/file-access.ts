/**
 * The browser implementation of {@link FileAccess}.
 *
 * Backed by the File System Access API. This is the reference for what the
 * Android SAF implementation will do: an opaque handle in, bytes out, no path
 * ever crossing the boundary.
 */
import type { DocumentKind, FileAccess, FileHandle, OpenedFile, SaveOutcome } from '@genoffice/host-contract'
import {
  hasFilePicker,
  openViaPicker,
  rawFileFor,
  readFromHandle,
  saveViaPicker,
  toArrayBuffer,
  writeToHandle,
} from './files.js'
import { sha256Hex } from './node-globals.js'

/** Handles the picker returned, keyed by id. */
const known = new Map<string, { size: number; writable: boolean }>()

export function createBrowserFileAccess(): FileAccess {
  return {
    async open(kind?: DocumentKind): Promise<OpenedFile | null> {
      const picked = await openViaPicker(kind)
      if (!picked.ok) return null
      const opened: OpenedFile = {
        handle: picked.handle,
        size: picked.data.byteLength,
        // a file the user picked through the picker is writable in place
        writable: true,
      }
      known.set(picked.handle.id, { size: opened.size, writable: opened.writable })
      return opened
    },

    async readChunk(handle: FileHandle, offset: number, end: number): Promise<Uint8Array> {
      // slice the File itself, not a decoded copy of it. pdf.js calls this in a
      // loop, so reading the whole document per chunk would turn one 50MB open
      // into dozens of full-size allocations — the browser equivalent of the
      // memory spike the desktop "chunked route" was built to avoid.
      const file = rawFileFor(handle.id)
      if (file) {
        const stop = Math.min(end, file.size)
        if (offset >= stop) return new Uint8Array(0)
        return new Uint8Array(await file.slice(offset, stop).arrayBuffer())
      }
      // a host with no File (a synthetic handle) can only answer from memory
      const all = await this.readAll(handle)
      return all.subarray(offset, Math.min(end, all.byteLength))
    },

    async readAll(handle: FileHandle): Promise<Uint8Array> {
      const data = await readFromHandle(handle)
      if (!data) throw new Error('handle is not readable in this host: ' + handle.id)
      return data
    },

    async readText(handle: FileHandle): Promise<string> {
      return new TextDecoder('utf-8').decode(await this.readAll(handle))
    },

    async save(handle: FileHandle, data: Uint8Array): Promise<SaveOutcome> {
      const result = await writeToHandle(handle, data)
      // createWritable() + close() commits, but there is no rename: a tab that
      // dies mid-write leaves a truncated file. ADR 3 carries this.
      // exactOptionalPropertyTypes: omit `error` rather than set it to undefined
      return result.ok
        ? { ok: true, atomic: false }
        : { ok: false, reason: 'error', ...(result.error ? { error: result.error } : {}) }
    },

    async saveAs(data, suggestedName, kind): Promise<OpenedFile | null> {
      const saved = await saveViaPicker(data, suggestedName, kind)
      if (!saved.ok) return null
      const opened: OpenedFile = { handle: saved.handle, size: data.byteLength, writable: true }
      known.set(saved.handle.id, { size: opened.size, writable: true })
      return opened
    },
  }
}

/** True when this environment can open files at all. */
export function browserFileAccessAvailable(): boolean {
  return hasFilePicker()
}

/** A content hash a caller can compare before overwriting. */
export async function hashBytes(bytes: Uint8Array): Promise<string> {
  return sha256Hex(bytes)
}

export { toArrayBuffer }
