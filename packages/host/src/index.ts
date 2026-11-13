/**
 * @genoffice/host — the single entry point a renderer uses.
 *
 * Replaces the scattered `window.desktop`, `window.aiOffice`, `window.pdfApi`,
 * `window.sheetsApi`, `window.slidesApi`, `window.markdownApi` and
 * `window.htmlApi` globals with one `host` object that works on every host.
 *
 * Resolution order:
 *  1. `globalThis.__genofficeHost` — an injected host (Android WebView bridge,
 *     Electron preload, tests)
 *  2. `window.desktop` — the current Electron preload, adapted below
 *  3. the browser host
 */
import type { HostCapabilities, OpenResult } from '@genoffice/host-contract'
import { BROWSER_CAPABILITIES, DESKTOP_CAPABILITIES } from '@genoffice/host-contract'
import { createBrowserHost } from './browser.js'
import { createSettingsStore } from './settings.js'
import { hasFilePicker, openViaPicker, saveViaPicker, writeToHandle } from './files.js'
import { isLegacyDesktopBridge } from './legacy-desktop-bridge.js'

export * from './browser.js'
export * from './files.js'
export * from './settings.js'
export * from './legacy-desktop-bridge.js'

/** The subset of `window.desktop` this facade adapts (see apps/docs/src/shared/ipc.ts). */
interface ElectronPreload {
  getLanguage?(): Promise<string>
  getTheme?(): Promise<'light' | 'dark' | 'system'>
  getDocumentTheme?(): Promise<'light' | 'dark' | 'follow'>
  getAuthorName?(): Promise<string>
  onLanguageChanged?(h: (l: string) => void): () => void
  onThemeChanged?(h: (t: 'light' | 'dark' | 'system') => void): () => void
  onDocumentThemeChanged?(h: (t: 'light' | 'dark' | 'follow') => void): () => void
  onAuthorNameChanged?(h: (n: string) => void): () => void
  openDocx?(): Promise<unknown>
  saveDocxAs?(...args: unknown[]): Promise<unknown>
  [key: string]: unknown
}

export type HostKind = 'electron' | 'browser' | 'injected'

/** The resolved host, in the shape renderers consume. */
export interface Host {
  readonly kind: HostKind
  readonly capabilities: HostCapabilities
  /** the raw Electron preload when present — migration-in-progress escape hatch */
  readonly electron: ElectronPreload | null
  language(): Promise<string>
  theme(): Promise<'light' | 'dark' | 'system'>
  documentTheme(): Promise<'light' | 'dark' | 'follow'>
  authorName(): Promise<string>
  openDocument(kind?: string): Promise<OpenResult>
  saveDocumentAs(data: Uint8Array, suggestedName: string): Promise<OpenResult>
  saveDocumentInPlace(handleId: string, data: Uint8Array): Promise<{ ok: boolean; error?: string }>
}

let cached: Host | null = null

/** Reset the cached host — tests and host hot-swap only. */
export function resetHost(): void {
  cached = null
}

function electronPreload(): ElectronPreload | null {
  // the legacy shim installs a `window.desktop` of its own; mistaking it for a
  // real preload would claim desktop capabilities on a phone
  if (isLegacyDesktopBridge()) return null
  const w = globalThis as unknown as { desktop?: ElectronPreload }
  return w.desktop && typeof w.desktop === 'object' ? w.desktop : null
}

/**
 * Build the host for this environment.
 *
 * The Electron branch deliberately keeps returning the raw preload as
 * `electron`: the renderer still has ~500 call sites on `window.desktop` and
 * the migration proceeds one group at a time. New code must use the facade.
 */
export function resolveHost(): Host {
  if (cached) return cached

  const injected = (globalThis as unknown as { __genofficeHost?: Host }).__genofficeHost
  if (injected) {
    cached = injected
    return cached
  }

  const preload = electronPreload()
  if (preload) {
    cached = {
      kind: 'electron',
      capabilities: DESKTOP_CAPABILITIES,
      electron: preload,
      language: () => preload.getLanguage?.() ?? Promise.resolve('zh'),
      theme: () => preload.getTheme?.() ?? Promise.resolve('system'),
      documentTheme: () => preload.getDocumentTheme?.() ?? Promise.resolve('follow'),
      authorName: () => preload.getAuthorName?.() ?? Promise.resolve(''),
      // the Electron path keeps using the preload's own file APIs; the facade
      // only gets first-class file handling once those signatures are
      // de-pathed (see docs/mobile/decisions.md, ADR 2)
      openDocument: async () => ({ ok: false, reason: 'unsupported' }),
      saveDocumentAs: async () => ({ ok: false, reason: 'unsupported' }),
      saveDocumentInPlace: async () => ({ ok: false, error: 'use window.desktop on the desktop host' }),
    }
    return cached
  }

  const browser = createBrowserHost()
  const store = createSettingsStore()
  cached = {
    kind: 'browser',
    capabilities: { ...BROWSER_CAPABILITIES, openFile: hasFilePicker(), saveFile: hasFilePicker() },
    electron: null,
    language: async () => store.read().language,
    theme: async () => store.read().theme,
    documentTheme: async () => store.read().documentTheme,
    authorName: async () => store.read().authorName,
    openDocument: (kind) => openViaPicker(kind as never),
    saveDocumentAs: (data, name) => saveViaPicker(data, name),
    saveDocumentInPlace: (id, data) => writeToHandle({ id, name: '' }, data),
  }
  return cached
}

/** The host for this environment (memoized). */
export function getHost(): Host {
  return resolveHost()
}
