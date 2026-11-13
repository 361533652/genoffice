import {
  BROWSER_CAPABILITIES,
  type AiHost,
  type DialogHost,
  type FileHost,
  type HostCapabilities,
  type OpenResult,
  type PrintHost,
  type SettingsHost,
} from '@genoffice/host-contract'
import {
  hasFilePicker,
  openViaPicker,
  readFromHandle,
  saveViaPicker,
  writeToHandle,
} from './files.js'
import { createSettingsStore } from './settings.js'

/** A host that runs in a plain browser / WebView with no native bridge. */
export interface BrowserHost {
  readonly kind: 'browser'
  readonly capabilities: HostCapabilities
  readonly files: FileHost
  readonly dialog: DialogHost
  readonly settings: SettingsHost
  readonly print: PrintHost
  readonly ai: AiHost | null
}

const noop = (): void => {}

/**
 * The browser host.
 *
 * Everything here is implemented with web platform primitives so the renderer
 * can boot without an Electron preload. Features a browser genuinely cannot do
 * (in-place save of a path the user never granted, native print dialog, Zotero,
 * CLI) degrade to a capability flag being false rather than a thrown error.
 */
export function createBrowserHost(): BrowserHost {
  const settings = createSettingsStore()
  const listeners: { language: Set<(l: string) => void>; theme: Set<(t: 'light' | 'dark' | 'system') => void>; docTheme: Set<(t: 'light' | 'dark' | 'follow') => void>; author: Set<(n: string) => void> } = {
    language: new Set(),
    theme: new Set(),
    docTheme: new Set(),
    author: new Set(),
  }

  const files: FileHost = {
    open: (kind) => openViaPicker(kind),
    saveAs: (data, suggestedName) => saveViaPicker(data, suggestedName),
    saveInPlace: (handle, data) => writeToHandle(handle, data),
    read: (handle) => readFromHandle(handle),
    rename: async () => ({ ok: false, error: 'renaming needs a native file host' }),
  }

  const dialog: DialogHost = {
    // a browser host has no shell-owned modal; window.confirm is the honest
    // equivalent and returns synchronously, so wrap it
    confirm: async (message) => globalThis.confirm?.(message) ?? false,
    alert: async (message) => {
      globalThis.alert?.(message)
    },
    pickImage: async () => {
      if (!hasFilePicker()) return null
      const picked = await openViaPicker()
      if (!picked.ok) return null
      const bytes = picked.data
      const base64 = bytesToBase64(bytes)
      return { base64, mime: guessImageMime(picked.handle.name), name: picked.handle.name }
    },
  }

  const settingsHost: SettingsHost = {
    getLanguage: async () => settings.read().language,
    getTheme: async () => settings.read().theme,
    getDocumentTheme: async () => settings.read().documentTheme,
    getAuthorName: async () => settings.read().authorName,
    onLanguageChanged(handler) {
      listeners.language.add(handler)
      return () => listeners.language.delete(handler)
    },
    onThemeChanged(handler) {
      listeners.theme.add(handler)
      return () => listeners.theme.delete(handler)
    },
    onDocumentThemeChanged(handler) {
      listeners.docTheme.add(handler)
      return () => listeners.docTheme.delete(handler)
    },
    onAuthorNameChanged(handler) {
      listeners.author.add(handler)
      return () => listeners.author.delete(handler)
    },
  }

  const print: PrintHost = {
    print: async () => ({ ok: false, error: 'print needs a native host' }),
    listPrinters: async () => [],
    exportPdf: async () => ({ ok: false, error: 'PDF export needs a native host' }),
  }

  // A browser host starts with the AI surface off: wiring the provider stack is
  // a separate step, and a half-wired AiHost is worse than an honest null.
  const ai: AiHost | null = null

  return {
    kind: 'browser',
    capabilities: { ...BROWSER_CAPABILITIES, openFile: hasFilePicker(), saveFile: hasFilePicker() },
    files,
    dialog,
    settings: settingsHost,
    print,
    ai,
  }
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = ''
  const chunk = 0x8000
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk))
  }
  return globalThis.btoa ? globalThis.btoa(binary) : ''
}

function guessImageMime(name: string): string {
  const ext = name.slice(name.lastIndexOf('.')).toLowerCase()
  if (ext === '.png') return 'image/png'
  if (ext === '.gif') return 'image/gif'
  if (ext === '.webp') return 'image/webp'
  return 'image/jpeg'
}

export { noop as _noop }

/** Convenience: does this browser host accept an open result at all? */
export function canOpen(result: OpenResult): result is Extract<OpenResult, { ok: true }> {
  return result.ok
}
