import { describe, expect, it, beforeEach } from 'vitest'
import { normalizeSettings, defaultSettings, SUPPORTED_LANGUAGES } from '../src/settings.js'
import { resolveHost, resetHost, installLegacyDesktopBridge, LEGACY_BRIDGE_NAMES } from '../src/index.js'

beforeEach(() => {
  resetHost()
  const scope = globalThis as unknown as Record<string, unknown>
  delete scope.__genofficeHost
  for (const name of ['desktop', 'desktopApi', 'aiOffice', 'pdfApi', 'sheetsApi', 'slidesApi', 'markdownApi', 'htmlApi']) {
    delete scope[name]
  }
})

describe('settings', () => {
  it('returns the documented defaults', () => {
    const d = defaultSettings()
    expect(d.language).toBe('zh')
    expect(d.theme).toBe('system')
    expect(d.documentTheme).toBe('follow')
    expect(d.autoSave).toBe('on')
  })

  it('falls back to defaults for a non-object payload', () => {
    expect(normalizeSettings(null)).toEqual(defaultSettings())
    expect(normalizeSettings('nope')).toEqual(defaultSettings())
  })

  it('keeps known values and drops unknown ones', () => {
    const s = normalizeSettings({ language: 'en', theme: 'dark', documentTheme: 'light', authorName: 'Ada' })
    expect(s.language).toBe('en')
    expect(s.theme).toBe('dark')
    expect(s.documentTheme).toBe('light')
    expect(s.authorName).toBe('Ada')
  })

  it('rejects a language the shell does not know', () => {
    expect(normalizeSettings({ language: 'klingon' }).language).toBe('zh')
    for (const lang of SUPPORTED_LANGUAGES) {
      expect(normalizeSettings({ language: lang }).language).toBe(lang)
    }
  })

  it('rejects an out-of-range theme', () => {
    expect(normalizeSettings({ theme: 'sepia' }).theme).toBe('system')
    expect(normalizeSettings({ theme: 'dark' }).theme).toBe('dark')
  })
})

describe('host resolution', () => {
  it('prefers an injected host', () => {
    const sentinel = { kind: 'injected', capabilities: {} } as never
    ;(globalThis as Record<string, unknown>).__genofficeHost = sentinel
    expect(resolveHost()).toBe(sentinel)
  })

  it('reports the electron host when a preload is present', () => {
    ;(globalThis as Record<string, unknown>).desktop = { getLanguage: async () => 'en' }
    const host = resolveHost()
    expect(host.kind).toBe('electron')
    expect(host.electron).not.toBeNull()
    expect(host.capabilities.localPaths).toBe(true)
  })

  it('falls back to the browser host with no bridge', () => {
    const host = resolveHost()
    expect(host.kind).toBe('browser')
    expect(host.electron).toBeNull()
    expect(host.capabilities.localPaths).toBe(false)
  })

  it('does not mistake its own legacy shim for an Electron preload', () => {
    // regression: the shim installs window.desktop, and reading that as a real
    // bridge claimed desktop capabilities on a phone (found on a 390px viewport)
    installLegacyDesktopBridge()
    const host = resolveHost()
    expect(host.kind).toBe('browser')
    expect(host.capabilities.localPaths).toBe(false)
    expect(host.capabilities.tabs).toBe(false)
  })

  it('answers every legacy global the six apps use', () => {
    // each app invented its own namespace: docs reads window.desktop,
    // sheets window.desktopApi, slides window.slidesApi, and so on
    installLegacyDesktopBridge()
    const scope = globalThis as unknown as Record<string, unknown>
    for (const name of LEGACY_BRIDGE_NAMES) {
      expect(scope[name], name).toBeDefined()
    }
  })

  it('leaves an existing real bridge untouched', () => {
    const real = { getLanguage: async () => 'en' }
    ;(globalThis as Record<string, unknown>).desktop = real
    installLegacyDesktopBridge()
    expect((globalThis as Record<string, unknown>).desktop).toBe(real)
  })

  it('does not throw on an unknown probe', async () => {
    const stats = installLegacyDesktopBridge()
    const bridge = (globalThis as Record<string, unknown>).desktop as Record<string, (...a: unknown[]) => Promise<unknown>>
    await expect(bridge.someMethodNobodyImplemented()).resolves.toBeUndefined()
    expect(stats.unmapped.has('someMethodNobodyImplemented')).toBe(true)
  })

  it('fails loudly for a desktop-only action instead of reporting success', async () => {
    // splitPdf() returning undefined told the UI its split had worked when
    // nothing happened — the user believes a file operation they never got
    installLegacyDesktopBridge()
    const bridge = (globalThis as Record<string, unknown>).desktop as Record<string, () => Promise<unknown>>
    await expect(bridge.splitPdf()).rejects.toThrow(/desktop app/)
    await expect(bridge.ocrPage()).rejects.toThrow(/desktop app/)
    await expect(bridge.signWithCertificate()).rejects.toThrow(/desktop app/)
  })

  it('fails loudly for AI actions rather than showing "thinking" forever', async () => {
    // a resolved-undefined aiStream left the panel in a thinking state and never
    // produced a token: the user waits on a request nobody sent
    installLegacyDesktopBridge()
    const bridge = (globalThis as Record<string, unknown>).desktop as Record<string, () => Promise<unknown>>
    await expect(bridge.aiChat()).rejects.toThrow(/desktop app/)
    await expect(bridge.aiStream()).rejects.toThrow(/desktop app/)
    await expect(bridge.webSearch()).rejects.toThrow(/desktop app/)
    // settings are still a probe, not an action
    await expect(bridge.getAiSettings()).resolves.toEqual({})
  })

  it('still answers probes neutrally', async () => {
    // the distinction is action vs probe, not "everything throws"
    installLegacyDesktopBridge()
    const bridge = (globalThis as Record<string, unknown>).desktop as Record<string, () => Promise<unknown>>
    await expect(bridge.getRecentFiles()).resolves.toEqual([])
    await expect(bridge.getLanguage()).resolves.toBe('zh')
  })

  it('returns an unsubscribe function for subscription-style names', () => {
    installLegacyDesktopBridge()
    const bridge = (globalThis as Record<string, unknown>).desktop as Record<string, (cb: () => void) => () => void>
    expect(typeof bridge.onSomethingHappened(() => {})).toBe('function')
  })

  it('still prefers a real preload over the shim', () => {
    installLegacyDesktopBridge()
    ;(globalThis as Record<string, unknown>).desktop = { getLanguage: async () => 'en' }
    // a real preload replaces the shim, so the marker is gone with it
    expect(resolveHost().kind).toBe('electron')
  })

  it('memoizes the resolved host until reset', () => {
    const first = resolveHost()
    expect(resolveHost()).toBe(first)
    resetHost()
    // a fresh build, not the same object
    expect(resolveHost()).not.toBe(first)
    // and the replacement is memoized in its turn
    const second = resolveHost()
    expect(resolveHost()).toBe(second)
  })

  it('answers settings from the browser host without a bridge', async () => {
    const host = resolveHost()
    // no localStorage in the node test environment: the in-memory store answers
    expect(await host.language()).toBe('zh')
    expect(await host.theme()).toBe('system')
    expect(await host.documentTheme()).toBe('follow')
  })
})
