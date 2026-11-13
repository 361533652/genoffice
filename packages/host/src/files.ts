import type { DocumentKind, FileHandle, OpenResult } from '@genoffice/host-contract'
import { sha256Hex } from './node-globals.js'

/**
 * Browser file access through the File System Access API.
 *
 * This is the browser host's `FileHost`. It mirrors what Android SAF will do
 * later: the renderer gets an opaque handle plus bytes, never a path. Where the
 * API is missing (Safari, older WebViews) every entry point reports
 * `unsupported` instead of throwing, so the UI can hide the affordance.
 */

const EXT_BY_KIND: Record<DocumentKind, string> = {
  docx: '.docx',
  xlsx: '.xlsx',
  pptx: '.pptx',
  pdf: '.pdf',
  markdown: '.md',
  html: '.html',
}

interface FsWindow {
  showOpenFilePicker?: (options?: unknown) => Promise<FileSystemFileHandle[]>
  showSaveFilePicker?: (options?: unknown) => Promise<FileSystemFileHandle>
}

/** A handle plus the live FileSystemFileHandle behind it, when we have one. */
interface BrowserFileHandle extends FileHandle {
  readonly native?: unknown
}

let counter = 0
const liveHandles = new Map<string, FileSystemFileHandle>()

/**
 * Files a host handed over without a FileSystemFileHandle.
 *
 * A picker-backed host has a real handle; a host that received bytes from
 * elsewhere (a test, a drag-drop, and later an Android SAF descriptor) only has
 * the data. Both must answer {@link readFromHandle}, or a caller cannot tell
 * which kind of host it is on.
 */
const rawFiles = new Map<string, File>()

/** Register a plain File under a handle id. */
export function registerRawFile(id: string, file: File): void {
  rawFiles.set(id, file)
}

/** The plain File behind a handle, when the host kept one. */
export function rawFileFor(id: string): File | null {
  return rawFiles.get(id) ?? null
}

/** Register a File and return the handle id callers should store. */
export function grantFile(file: File, id = 'granted-' + (++counter)): string {
  rawFiles.set(id, file)
  return id
}

export function hasFilePicker(): boolean {
  const w = globalThis as unknown as FsWindow
  return typeof w.showOpenFilePicker === 'function' && typeof w.showSaveFilePicker === 'function'
}

export function rememberHandle(handle: FileSystemFileHandle, kind?: DocumentKind): BrowserFileHandle {
  const id = 'browser-' + ++counter
  liveHandles.set(id, handle)
  // exactOptionalPropertyTypes: an absent kind must be an absent key, not
  // `kind: undefined`, which the `DocumentKind` optional property rejects
  return {
    id,
    name: handle.name,
    ...(kind ? { kind } : {}),
    writable: true,
    native: handle,
  }
}

export function lookupHandle(id: string): FileSystemFileHandle | undefined {
  return liveHandles.get(id)
}

export async function openViaPicker(kind?: DocumentKind): Promise<OpenResult> {
  const w = globalThis as unknown as FsWindow
  if (!w.showOpenFilePicker) return { ok: false, reason: 'unsupported' }
  try {
    const types = kind
      ? [{ description: kind.toUpperCase(), accept: { 'application/octet-stream': [EXT_BY_KIND[kind]] } }]
      : undefined
    const [picked] = await w.showOpenFilePicker(types ? { types, multiple: false } : { multiple: false })
    if (!picked) return { ok: false, reason: 'canceled' }
    const file = await picked.getFile()
    const data = new Uint8Array(await file.arrayBuffer())
    const hash = await sha256Hex(data)
    return { ok: true, handle: rememberHandle(picked, kind), data, hash }
  } catch (error) {
    // an aborted picker rejects with AbortError; that is a cancel, not a fault
    if (error instanceof Error && error.name === 'AbortError') return { ok: false, reason: 'canceled' }
    return { ok: false, reason: 'error', error: String(error) }
  }
}

export async function saveViaPicker(data: Uint8Array, suggestedName: string, kind?: DocumentKind): Promise<OpenResult> {
  const w = globalThis as unknown as FsWindow
  if (!w.showSaveFilePicker) return { ok: false, reason: 'unsupported' }
  try {
    const handle = await w.showSaveFilePicker({
      suggestedName,
      types: kind ? [{ description: kind.toUpperCase(), accept: { 'application/octet-stream': [EXT_BY_KIND[kind]] } }] : undefined,
    })
    const writable = await (handle as unknown as { createWritable(): Promise<FileSystemWritableFileStream> }).createWritable()
    await writable.write(toArrayBuffer(data))
    await writable.close()
    return { ok: true, handle: rememberHandle(handle, kind), data }
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') return { ok: false, reason: 'canceled' }
    return { ok: false, reason: 'error', error: String(error) }
  }
}

export async function writeToHandle(handle: FileHandle, data: Uint8Array): Promise<{ ok: boolean; error?: string }> {
  // a plain File is read-only: replacing it needs a destination the user picked
  if (rawFiles.has(handle.id)) {
    return { ok: false, error: 'a granted File cannot be rewritten in place; use saveAs' }
  }
  const native = lookupHandle(handle.id)
  if (!native) return { ok: false, error: 'handle is not writable in this host' }
  try {
    const writable = await (native as unknown as { createWritable(): Promise<FileSystemWritableFileStream> }).createWritable()
    await writable.write(toArrayBuffer(data))
    await writable.close()
    return { ok: true }
  } catch (error) {
    return { ok: false, error: String(error) }
  }
}

export async function readFromHandle(handle: FileHandle): Promise<Uint8Array | null> {
  // a plain File (no picker handle) answers the same way
  const raw = rawFiles.get(handle.id)
  if (raw) {
    try {
      return new Uint8Array(await raw.arrayBuffer())
    } catch {
      return null
    }
  }
  const native = lookupHandle(handle.id)
  if (!native) return null
  try {
    const file = await native.getFile()
    return new Uint8Array(await file.arrayBuffer())
  } catch {
    return null
  }
}

/**
 * Copy bytes into a plain `ArrayBuffer`.
 *
 * `Uint8Array` is generic over its backing buffer since TS 5.7, and a value may
 * be backed by `SharedArrayBuffer`; the DOM's write/digest signatures require a
 * real `ArrayBuffer`, so hand them a copy rather than casting the type away.
 */
export function toArrayBuffer(data: Uint8Array): ArrayBuffer {
  const copy = new ArrayBuffer(data.byteLength)
  new Uint8Array(copy).set(data)
  return copy
}

// sha256Hex lives in ./node-globals.ts — it is the same helper the engine
// shims need, so there is exactly one implementation
