/** Persisted "View ▸ Dark Mode" choice for the Word-style dark page
 * (editor/dark-page.ts). Only consulted in the dark UI theme: absent = on, and
 * an explicit "off" sticks across documents, windows and restarts. */
export const DARK_PAGE_KEY = 'aidocs.darkPage'

/**
 * Storage here can fail in ways the optional chain does not catch: Safari private
 * mode, a full quota and a locked-down WebView all make `setItem` throw, and
 * accessing `localStorage` at all throws under a sandboxed frame. One uncaught
 * throw from this callback white-screens the whole app — measured by making
 * setItem throw: `root` stayed empty and the page rendered nothing.
 *
 * A preference that cannot be persisted is simply not remembered; the in-memory
 * value already applies.
 */
export function readDarkPagePref(): boolean | null {
  try {
    const raw = globalThis.localStorage?.getItem(DARK_PAGE_KEY)
    if (raw === '1') return true
    if (raw === '0') return false
    return null
  } catch {
    return null
  }
}

export function writeDarkPagePref(value: boolean): void {
  try {
    globalThis.localStorage?.setItem(DARK_PAGE_KEY, value ? '1' : '0')
  } catch {
    /* not persisted; the current session keeps the choice in state */
  }
}

/** the page state for a UI theme: a light theme never shows a dark page, whatever was stored */
export function resolveDarkPage(themeDark: boolean): boolean {
  return themeDark ? (readDarkPagePref() ?? true) : false
}
