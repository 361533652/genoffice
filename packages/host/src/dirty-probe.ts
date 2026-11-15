/**
 * The unsaved-session probe the Android host reads before a hard reload
 * (interaction-spec P1-6).
 *
 * `openApp()` in the native host reloads the shared WebView to switch editors.
 * Without a gate that silently discards an unsaved document, so the host asks
 * `window.__genofficeIsDirty()` first and shows a confirm when it answers true.
 * Each renderer registers its own dirty signal here; the probe is a plain
 * synchronous function so `evaluateJavascript` can read it in one round trip.
 *
 * Registering is idempotent and returns a teardown that only clears the global
 * if it still points at this probe (a remount must not wipe a newer register).
 */
export function registerDirtyProbe(getDirty: () => boolean): () => void {
  const w = globalThis as { __genofficeIsDirty?: () => boolean }
  w.__genofficeIsDirty = getDirty
  return () => {
    if (w.__genofficeIsDirty === getDirty) delete w.__genofficeIsDirty
  }
}
