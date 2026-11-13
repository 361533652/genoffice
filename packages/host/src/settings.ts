/**
 * Settings the browser host persists, stored under one localStorage key.
 *
 * The Electron shell keeps these in app-settings.json; a browser has nowhere
 * else to put them. Keeping the shapes identical means a renderer never has to
 * know which host answered.
 */
export interface StoredSettings {
  language: string
  theme: 'light' | 'dark' | 'system'
  documentTheme: 'light' | 'dark' | 'follow'
  authorName: string
  autoSave: 'off' | 'on' | 'prompt'
  aiPanelPrefs: Record<string, unknown>
}

const KEY = 'genoffice.settings'

/** Language keys the shell understands; anything else falls back to zh. */
export const SUPPORTED_LANGUAGES = [
  'zh',
  'en',
  'ja',
  'ko',
  'fr',
  'de',
  'es',
  'th',
  'id',
  'ru',
  'ar',
  'pt',
  'it',
  'pl',
  'cs',
  'nl',
] as const

export function defaultSettings(): StoredSettings {
  return {
    language: 'zh',
    theme: 'system',
    documentTheme: 'follow',
    authorName: '',
    autoSave: 'on',
    aiPanelPrefs: {},
  }
}

/** Narrow an arbitrary stored value onto the known settings shape. */
export function normalizeSettings(raw: unknown): StoredSettings {
  const base = defaultSettings()
  if (!raw || typeof raw !== 'object') return base
  const v = raw as Record<string, unknown>
  const pick = <T extends string>(value: unknown, allowed: readonly T[], fallback: T): T =>
    typeof value === 'string' && (allowed as readonly string[]).includes(value) ? (value as T) : fallback
  return {
    language: pick(v.language, SUPPORTED_LANGUAGES, base.language),
    theme: pick(v.theme, ['light', 'dark', 'system'] as const, base.theme),
    documentTheme: pick(v.documentTheme, ['light', 'dark', 'follow'] as const, base.documentTheme),
    authorName: typeof v.authorName === 'string' ? v.authorName : base.authorName,
    autoSave: pick(v.autoSave, ['off', 'on', 'prompt'] as const, base.autoSave),
    aiPanelPrefs:
      v.aiPanelPrefs && typeof v.aiPanelPrefs === 'object'
        ? (v.aiPanelPrefs as Record<string, unknown>)
        : base.aiPanelPrefs,
  }
}

/** A settings store backed by localStorage, with in-memory fallback. */
export function createSettingsStore(): {
  read(): StoredSettings
  patch(next: Partial<StoredSettings>): StoredSettings
} {
  let cached: StoredSettings | null = null

  const load = (): StoredSettings => {
    if (cached) return cached
    try {
      const raw = globalThis.localStorage?.getItem(KEY)
      cached = normalizeSettings(raw ? JSON.parse(raw) : null)
    } catch {
      cached = defaultSettings()
    }
    return cached
  }

  return {
    read: load,
    patch(next) {
      cached = { ...load(), ...next }
      try {
        globalThis.localStorage?.setItem(KEY, JSON.stringify(cached))
      } catch {
        /* private mode / no storage: the in-memory copy still serves this session */
      }
      return cached
    },
  }
}
