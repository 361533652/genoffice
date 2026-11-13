/**
 * Opaque document handle.
 *
 * The single most important part of the mobile migration: renderers must stop
 * passing absolute filesystem paths around (the current renderer has ~400
 * `path`-shaped parameters). A browser cannot see a path, and Android SAF
 * hands out a `content://` URI plus a file descriptor instead of a real path.
 *
 * A `FileHandle` is whatever the host wants it to be. The renderer only ever
 * compares it, passes it back, and asks the host to read/write through it.
 */
export interface FileHandle {
  /** stable identity of this handle for the duration of the session */
  readonly id: string
  /** display name (e.g. `报告.docx`), never a full path */
  readonly name: string
  /** mime-ish kind, when the host knows it */
  readonly kind?: DocumentKind
  /** true when the host can rewrite this handle in place (SAF: usually false) */
  readonly writable?: boolean
}

export type DocumentKind =
  | 'docx'
  | 'xlsx'
  | 'pptx'
  | 'pdf'
  | 'markdown'
  | 'html'

/** Result of asking the host to open a document. */
export type OpenResult =
  | {
      ok: true
      handle: FileHandle
      /** the raw bytes; the renderer parses them itself */
      data: Uint8Array
      /** host-side hash of the original bytes, when the host keeps an archive copy */
      hash?: string
      /** the file is password protected and `data` is unavailable until decrypt() */
      encrypted?: boolean
    }
  | { ok: false; reason: 'canceled' | 'unsupported' | 'error'; error?: string }
