/**
 * Portrait-phone form factor detection shared by every renderer.
 *
 * The contract (interaction-spec §6.1): form factor is a VIEWPORT question,
 * never a host-capability question. A phone browser and the Android WebView
 * must land on the same layout, so the predicate is a plain media query —
 * `getHost().capabilities` describes host APIs, not shape, and is deliberately
 * not consulted here. Desktop (>720px) keeps every default, persistence and
 * drag behaviour untouched.
 *
 * The 720px threshold matches `mobile.css`; keep the two in lockstep.
 */
import { useEffect, useState } from 'react'

export const NARROW_VIEWPORT_QUERY = '(max-width: 720px)'

/** True on a portrait-phone-width viewport. Safe where matchMedia is absent
 *  (jsdom / SSR): those environments report "not narrow", i.e. desktop. */
export function isNarrowViewport(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false
  return window.matchMedia(NARROW_VIEWPORT_QUERY).matches
}

/** Reactive form factor: re-renders when the viewport crosses the threshold
 *  (rotation, a resized window). Use for DOM-order / mount decisions; pure CSS
 *  mobile rules need no hook because the media query gates them already. */
export function useNarrowViewport(): boolean {
  const [narrow, setNarrow] = useState(isNarrowViewport)
  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return
    const mql = window.matchMedia(NARROW_VIEWPORT_QUERY)
    const onChange = (e: MediaQueryListEvent) => setNarrow(e.matches)
    // older WebViews only expose addListener; both paths stay in sync
    if (typeof mql.addEventListener === 'function') {
      mql.addEventListener('change', onChange)
      return () => mql.removeEventListener('change', onChange)
    }
    mql.addListener(onChange)
    return () => mql.removeListener(onChange)
  }, [])
  return narrow
}
