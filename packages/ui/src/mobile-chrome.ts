/**
 * Mobile chrome auto-collapse.
 *
 * On a phone the ribbon and the status bar are the two things that make the
 * editors feel like a desktop window projected onto a small screen: they take
 * roughly a fifth of the height for controls that are not what the user is
 * reading. The rule the user asked for is simple:
 *
 *   - while they drag / scroll / pinch to read, the chrome gets out of the way;
 *   - only a genuine TAP brings it back. A drag is not a tap, and a multi-finger
 *     gesture is not a tap either.
 *
 * Collapsing happens after the gesture settles (scroll idle), never in the
 * middle of it: hiding a row mid-drag changes the layout under the finger and
 * makes the scroll jump. The tap test is the same one browsers use for a click:
 * one pointer, little movement, short duration.
 *
 * Desktop and wide viewports are untouched (the media query gates everything).
 */

const TAP_SLOP_PX = 10
const TAP_MAX_MS = 400
const DRAG_HIDE_PX = 12
const SCROLL_IDLE_MS = 180

/** chrome is hidden by this attribute on <html>; the CSS in mobile.css acts on it */
const CHROME_ATTR = 'data-mobile-chrome'

export interface MobileChromeHandle {
  readonly hidden: boolean
  show: () => void
  hide: () => void
  dispose: () => void
}

let installed: MobileChromeHandle | null = null
const listeners = new Set<(hidden: boolean) => void>()

/**
 * Install the auto-collapse behaviour once per document. Idempotent: the six
 * editors each call it at boot, and a second call returns the live handle.
 */
export function installMobileChrome(doc: Document = document): MobileChromeHandle {
  if (installed) return installed

  const root = doc.documentElement
  const narrow = typeof matchMedia === 'function' ? matchMedia('(max-width: 720px)') : null
  const cleanups: (() => void)[] = []

  let pointer: { id: number; x: number; y: number; t: number } | null = null
  let activePointers = 0
  let multiTouch = false
  let idleTimer: ReturnType<typeof setTimeout> | null = null

  const setHidden = (hidden: boolean): void => {
    if (!narrow?.matches) return
    const next = hidden ? 'hidden' : 'shown'
    if (root.getAttribute(CHROME_ATTR) === next) return
    root.setAttribute(CHROME_ATTR, next)
    for (const fn of listeners) fn(hidden)
  }

  const hide = (): void => setHidden(true)
  const show = (): void => setHidden(false)

  /**
   * A tap is the "bring it back" gesture: restore the chrome AND the band.
   *
   * A tap that lands ON the chrome is a deliberate control press, not a reading
   * tap: the tab/button underneath owns the band transition. Expanding here
   * first made a tap on a tab race its own toggle — the tap expanded the band to
   * compact, then the tab press collapsed it again (net: nothing happened).
   */
  const revealByTap = (target: EventTarget | null): void => {
    const el = target instanceof Element ? target : null
    const onChrome = !!el?.closest('.ribbon, .ribbon-tabs, .status-bar')
    if (!onChrome) {
      ;(globalThis as { __genofficeExpandRibbon?: () => void }).__genofficeExpandRibbon?.()
    }
    show()
  }

  const scheduleHide = (): void => {
    if (idleTimer) clearTimeout(idleTimer)
    idleTimer = setTimeout(() => {
      idleTimer = null
      hide()
    }, SCROLL_IDLE_MS)
  }

  const onWheel = (event: WheelEvent): void => {
    // programmatic scrolling never fires wheel; only a real user gesture does.
    // Chrome synthesises ctrl+wheel for two-finger pinch-zoom — that is a zoom,
    // not a reading scroll, and hiding the status bar would take away the zoom
    // readout the gesture is driving (pinned by mobile-pinch-zoom).
    if (!event.isTrusted) return
    if (event.ctrlKey) return
    if (Math.abs(event.deltaY) + Math.abs(event.deltaX) < 2) return
    scheduleHide()
  }

  const onPointerDown = (event: PointerEvent): void => {
    activePointers += 1
    if (activePointers > 1) {
      // a second finger makes this a multi-touch gesture (pinch). Treating it as
      // a reading scroll would hide the status bar — and with it the zoom
      // readout the pinch is driving (pinned by mobile-pinch-zoom).
      multiTouch = true
      if (idleTimer) clearTimeout(idleTimer)
      idleTimer = null
    }
    if (!event.isPrimary || event.pointerType === 'mouse') return
    pointer = { id: event.pointerId, x: event.clientX, y: event.clientY, t: Date.now() }
  }

  const onPointerMove = (event: PointerEvent): void => {
    if (!event.isTrusted) return
    // pinch/rotate is not a reading scroll; keep the chrome (and its zoom UI)
    if (multiTouch) return
    if (!pointer || event.pointerId !== pointer.id) return
    const dx = event.clientX - pointer.x
    const dy = event.clientY - pointer.y
    if (Math.hypot(dx, dy) > DRAG_HIDE_PX) scheduleHide()
  }

  const onPointerUp = (event: PointerEvent): void => {
    activePointers = Math.max(0, activePointers - 1)
    const wasMulti = multiTouch
    if (activePointers === 0) multiTouch = false
    const start = pointer
    pointer = null
    if (!start || event.pointerId !== start.id) return
    if (wasMulti || event.pointerType === 'mouse') return
    const moved = Math.hypot(event.clientX - start.x, event.clientY - start.y)
    const elapsed = Date.now() - start.t
    // a tap — and only a tap — brings the chrome back
    if (moved <= TAP_SLOP_PX && elapsed <= TAP_MAX_MS) revealByTap(event.target)
  }

  const onPointerCancel = (): void => {
    activePointers = Math.max(0, activePointers - 1)
    pointer = null
    multiTouch = false
  }

  const onFocusIn = (event: FocusEvent): void => {
    const el = event.target as HTMLElement | null
    if (!el) return
    if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable) show()
  }

  const onMqChange = (): void => {
    if (!narrow?.matches) {
      // leaving the narrow layout drops the attribute so desktop keeps its chrome
      root.removeAttribute(CHROME_ATTR)
    }
  }

  const listen = <K extends keyof DocumentEventMap>(
    type: K,
    fn: (event: DocumentEventMap[K]) => void,
    options?: AddEventListenerOptions,
  ): void => {
    doc.addEventListener(type, fn as EventListener, options)
    cleanups.push(() => doc.removeEventListener(type, fn as EventListener, options))
  }

  listen('wheel', onWheel, { capture: true, passive: true })
  // NB: no touchstart reset — touchstart fires AFTER pointerdown, and resetting
  // the pointer count there destroyed the multi-touch flag (a pinch then looked
  // like a single-finger drag and hid the chrome mid-gesture).
  listen('pointerdown', onPointerDown, { capture: true, passive: true })
  listen('pointermove', onPointerMove, { capture: true, passive: true })
  listen('pointerup', onPointerUp, { capture: true, passive: true })
  listen('pointercancel', onPointerCancel, { capture: true, passive: true })
  // NB: no generic 'scroll' listener. Programmatic scrolling (scrollIntoView when
  // a click or focus moves something into view, a dialog opening, layout reflow)
  // also fires scroll and would swallow the chrome at random. Touch drags and
  // wheel produce pointer/wheel events of their own, which is what we listen to.
  listen('focusin', onFocusIn, { capture: true })
  narrow?.addEventListener('change', onMqChange)
  cleanups.push(() => narrow?.removeEventListener('change', onMqChange))

  const handle: MobileChromeHandle = {
    get hidden() {
      return root.getAttribute(CHROME_ATTR) === 'hidden'
    },
    show,
    hide,
    dispose() {
      for (const fn of cleanups) fn()
      cleanups.length = 0
      if (idleTimer) clearTimeout(idleTimer)
      root.removeAttribute(CHROME_ATTR)
      installed = null
    },
  }
  installed = handle
  // hand the tests (and the native back handler) a live handle
  ;(
    globalThis as {
      __genofficeMobileChrome?: { hide: () => void; show: () => void; hidden: () => boolean }
    }
  ).__genofficeMobileChrome = { hide, show, hidden: () => handle.hidden }
  return handle
}

/** Subscribe to chrome visibility changes; returns an unsubscribe function. */
export function onMobileChromeChange(fn: (hidden: boolean) => void): () => void {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

/**
 * Collapse or restore the chrome from outside this module.
 *
 * A canvas app that swallows pointer gestures before they reach the document
 * listener (sheets turns a drag into wheel deltas) still has to tell the chrome
 * that the user is reading; it calls these once its gesture settles.
 */
export function hideMobileChrome(): void {
  installed?.hide()
}

export function showMobileChrome(): void {
  installed?.show()
}
