/**
 * The file-access contract every host implements, in one place.
 *
 * The renderers currently reach for a dozen differently-shaped file APIs:
 * `openDocx()`, `openPdf()`, `openMarkdown()`, `consumePending()`,
 * `readFile(path)`, `readFileChunk(path, offset, end)`, `saveDocx(path, buf)`...
 * Each app invented its own, and each signature carries a filesystem path that a
 * browser cannot honour and Android SAF cannot supply.
 *
 * This module is the shape they should all collapse into. A host returns an
 * opaque handle; the renderer reads and writes *through* that handle and never
 * learns a path.
 */
import type { DocumentKind, FileHandle } from '@genoffice/host-contract'

/** What a host can tell a caller about a file it opened. */
export interface OpenedFile {
  readonly handle: FileHandle
  /** total size in bytes, when the host knows it up front */
  readonly size: number
  /** true when the host can rewrite this handle in place */
  readonly writable: boolean
}

/**
 * Read part of a file.
 *
 * Chunked on purpose: the PDF viewer streams a large document rather than
 * materialising it, and SAF hands out a stream rather than random access. A host
 * that can do better still answers this shape.
 */
export interface FileReader {
  readChunk(handle: FileHandle, offset: number, end: number): Promise<Uint8Array>
  /** the whole file, for callers that need it in one buffer */
  readAll(handle: FileHandle): Promise<Uint8Array>
  /** the whole file as UTF-8 text, for markdown/html */
  readText(handle: FileHandle): Promise<string>
}

/** Write a document back. */
export interface FileWriter {
  /**
   * Save to the handle the file came from.
   *
   * Hosts without atomic replace answer `atomic: false`; a caller that needs
   * crash safety (recovery copies) must check.
   */
  save(handle: FileHandle, data: Uint8Array): Promise<SaveOutcome>
  /** Save under a new name, returning the handle the user chose */
  saveAs(data: Uint8Array, suggestedName: string, kind?: DocumentKind): Promise<OpenedFile | null>
}

export type SaveOutcome =
  | { ok: true; atomic: boolean }
  | { ok: false; reason: 'readonly' | 'error'; error?: string }

/** Everything a file-capable host offers. */
export interface FileAccess extends FileReader, FileWriter {
  /** show the platform picker and open one document */
  open(kind?: DocumentKind): Promise<OpenedFile | null>
}
