import type { FileHandle, DocumentKind, OpenResult } from './handle.js'

/**
 * The contract split by concern.
 *
 * The current renderer reaches six different global bridges
 * (`window.desktop`, `window.desktopApi`, `window.aiOffice`, `window.pdfApi`,
 * `window.sheetsApi`, `window.slidesApi`, `window.markdownApi`, `window.htmlApi`)
 * whose interfaces overlap by only a fraction — 177 methods in docs versus 404
 * in slides, intersecting in 65. Nine globals with no single entry point is
 * what makes a second host expensive.
 *
 * These groups are that entry point. Each app implements the groups it needs;
 * shared code takes the narrowest group it can.
 */

/** Opening, saving and round-tripping document bytes. */
export interface FileHost {
  /** show a picker and return the chosen document's bytes */
  open(kind?: DocumentKind): Promise<OpenResult>
  /** write bytes to a user-chosen destination; returns the new handle */
  saveAs(data: Uint8Array, suggestedName: string): Promise<OpenResult>
  /** rewrite an existing handle in place; `reason` feeds the "saving…" UI */
  saveInPlace(handle: FileHandle, data: Uint8Array): Promise<{ ok: boolean; error?: string }>
  /** read the bytes behind a handle without opening it in the UI */
  read(handle: FileHandle): Promise<Uint8Array | null>
  /** move a right-to-left filename from the host's cache into the user's file */
  rename(handle: FileHandle, nextName: string): Promise<{ ok: boolean; error?: string }>
}

/** Modal UI the host owns (confirmations, alerts, pickers). */
export interface DialogHost {
  confirm(message: string): Promise<boolean>
  alert(message: string): Promise<void>
  /** pick one image and return it base64-encoded, mirroring PickImageResult */
  pickImage(): Promise<{ base64: string; mime: string; name: string } | null>
}

/** Settings and preferences the shell persists on the app's behalf. */
export interface SettingsHost {
  getLanguage(): Promise<string>
  getTheme(): Promise<'light' | 'dark' | 'system'>
  getDocumentTheme(): Promise<'light' | 'dark' | 'follow'>
  getAuthorName(): Promise<string>
  /** subscribe to a settings change; returns an unsubscribe function */
  onLanguageChanged(handler: (lang: string) => void): () => void
  onThemeChanged(handler: (theme: 'light' | 'dark' | 'system') => void): () => void
  onDocumentThemeChanged(handler: (theme: 'light' | 'dark' | 'follow') => void): () => void
  onAuthorNameChanged(handler: (name: string) => void): () => void
}

/** AI chat, streaming and the media tools the editor exposes to the model. */
export interface AiHost {
  chat(request: unknown): Promise<unknown>
  stream(request: unknown): Promise<unknown>
  cancelStream(requestId: string): Promise<void>
  webSearch(query: string, max: number): Promise<unknown>
  imageSearch(query: string, max: number): Promise<unknown>
  fetchImage(url: string): Promise<unknown>
}

/** Print and export targets. */
export interface PrintHost {
  print(): Promise<{ ok: boolean; error?: string }>
  listPrinters(): Promise<{ name: string; isDefault: boolean }[]>
  exportPdf(): Promise<{ ok: boolean; error?: string }>
}

/** Where a host can run external programs (desktop only). */
export interface CliHost {
  runCli(args: string[]): Promise<{ code: number; stdout: string; stderr: string }>
}
