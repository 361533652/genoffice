/**
 * Touch scrolling for the Univer grid.
 *
 * Univer scrolls on wheel. On a phone there is no wheel and a one-finger drag is
 * interpreted as a RANGE SELECTION (measured: dragging vertically over the grid
 * selected B9:B18 and the viewport did not move at all). The only way to scroll
 * was to grab the thin scrollbar — which is exactly the complaint this fixes.
 *
 * The gesture layer here turns a one-finger drag into wheel deltas on the grid
 * canvas, so Univer's own scroll manager keeps the inertia and the clamping, and
 * turns a two-finger pinch into Ctrl+wheel zoom at the midpoint (the same path a
 * trackpad pinch takes). A tap — movement under the slop — is left untouched, so
 * selecting a cell still works.
 *
 * The range drag is swallowed once the gesture becomes a scroll: the moves stop
 * propagating before Univer's canvas sees them. Otherwise a scrolled page would
 * also leave a huge selection behind.
 */

import { hideMobileChrome } from '@genoffice/ui'

const SLOP_PX = 8
const WHEEL_GAIN = 1.15
const PINCH_GAIN = 0.9

type Mode = 'idle' | 'pending' | 'scroll' | 'pinch'

let installed: (() => void) | null = null

/**
 * Install once, at module boot — BEFORE Univer boots.
 *
 * Univer registers its own window-level pointer/touch handlers for drag-to-select;
 * a handler registered later never gets the chance to stop anything. Installing
 * here (main.tsx runs before React and before Univer) puts this capture listener
 * first, so a scroll gesture is stopped before the selection logic sees it.
 */
export function installSheetTouchScroll(host?: HTMLElement): () => void {
  if (installed) return installed
  const resolveHost = (): HTMLElement | null => host ?? document.getElementById('univer-container')
  const points = new Map<number, { x: number; y: number }>()
  let mode: Mode = 'idle'
  let primaryId: number | null = null
  let startX = 0
  let startY = 0
  let lastX = 0
  let lastY = 0
  let pinchDistance = 0

  const canvas = (): HTMLCanvasElement | null => {
    const el = resolveHost()
    if (!el) return null
    let best: HTMLCanvasElement | null = null
    let area = 0
    for (const c of el.querySelectorAll('canvas')) {
      const r = c.getBoundingClientRect()
      if (r.width * r.height > area) {
        area = r.width * r.height
        best = c as HTMLCanvasElement
      }
    }
    return area > 40_000 ? best : null
  }

  const fireWheel = (x: number, y: number, dx: number, dy: number, ctrl: boolean): void => {
    const target = canvas()
    if (!target) return
    target.dispatchEvent(
      new WheelEvent('wheel', {
        deltaX: dx,
        deltaY: dy,
        clientX: x,
        clientY: y,
        ctrlKey: ctrl,
        bubbles: true,
        cancelable: true,
      }),
    )
  }

  /**
   * A scroll gesture is also a drag as far as Univer is concerned, and its
   * drag-end leaves a range selected. Collapsing that range through the facade
   * (getRange().activate()) does not clear the primary selection, so replay the
   * gesture as a tap at the point where the finger went down: Univer's own
   * handler then selects exactly that one cell.
   */
  const tapThrough = (x: number, y: number): void => {
    const target = canvas()
    if (!target) return
    const common = {
      bubbles: true,
      cancelable: true,
      clientX: x,
      clientY: y,
      pointerId: 99,
      pointerType: 'touch',
      isPrimary: true,
    }
    target.dispatchEvent(new PointerEvent('pointerdown', { ...common, buttons: 1 }))
    target.dispatchEvent(new PointerEvent('pointerup', { ...common, buttons: 0 }))
  }

  const inside = (event: PointerEvent): boolean => {
    const el = resolveHost()
    return !!el && event.target instanceof Node && el.contains(event.target)
  }

  const onDown = (event: PointerEvent): void => {
    if (event.pointerType === 'mouse' || !inside(event)) return
    points.set(event.pointerId, { x: event.clientX, y: event.clientY })
    if (points.size === 1) {
      mode = 'pending'
      primaryId = event.pointerId
      startX = lastX = event.clientX
      startY = lastY = event.clientY
    } else if (points.size === 2) {
      const [a, b] = [...points.values()]
      pinchDistance = Math.hypot(a!.x - b!.x, a!.y - b!.y)
      mode = 'pinch'
    }
  }

  const onMove = (event: PointerEvent): void => {
    const point = points.get(event.pointerId)
    if (!point) return
    point.x = event.clientX
    point.y = event.clientY

    if (mode === 'pinch' && points.size >= 2) {
      const [a, b] = [...points.values()]
      const distance = Math.hypot(a!.x - b!.x, a!.y - b!.y)
      const midX = (a!.x + b!.x) / 2
      const midY = (a!.y + b!.y) / 2
      // spreading the fingers (distance up) zooms in: Ctrl+wheel up
      const delta = (pinchDistance - distance) * PINCH_GAIN
      pinchDistance = distance
      if (Math.abs(delta) > 0.5) fireWheel(midX, midY, 0, delta, true)
      event.stopPropagation()
      return
    }

    if (event.pointerId !== primaryId) return
    if (mode === 'pending') {
      if (Math.hypot(event.clientX - startX, event.clientY - startY) <= SLOP_PX) return
      mode = 'scroll'
      lastX = event.clientX
      lastY = event.clientY
    }
    if (mode !== 'scroll') return
    const dx = event.clientX - lastX
    const dy = event.clientY - lastY
    lastX = event.clientX
    lastY = event.clientY
    if (dx === 0 && dy === 0) return
    // dragging the content up scrolls it down: the wheel delta is the inverse
    fireWheel(event.clientX, event.clientY, -dx * WHEEL_GAIN, -dy * WHEEL_GAIN, false)
    // the gesture is a scroll now, not a range drag
    event.stopPropagation()
  }

  const onUp = (event: PointerEvent): void => {
    points.delete(event.pointerId)
    if (mode === 'scroll' || mode === 'pinch') event.stopPropagation()
    // the chrome listener sits on the document, which this window-level handler
    // swallows for grid gestures — so tell it the user was reading, once the
    // finger is off (collapsing mid-drag would reflow under the finger)
    if (mode === 'scroll') {
      hideMobileChrome()
      window.setTimeout(() => tapThrough(startX, startY), 120)
    }
    if (points.size === 0) {
      mode = 'idle'
      primaryId = null
    } else if (points.size === 1) {
      const [id, p] = [...points.entries()][0]!
      primaryId = id
      lastX = p.x
      lastY = p.y
      startX = p.x
      startY = p.y
      mode = 'pending'
    }
  }

  // Univer's grid also listens to the touch stream (its drag-to-select works on
  // touch), so stopping only pointer events left the range selection growing
  // underneath the scroll. Same rule: a scroll or a pinch swallows the moves.
  const onTouchMove = (event: TouchEvent): void => {
    if (mode === 'scroll' || mode === 'pinch') event.stopPropagation()
  }
  const onTouchEnd = (event: TouchEvent): void => {
    if (mode === 'scroll' || mode === 'pinch') event.stopPropagation()
  }

  const onCancel = (event: PointerEvent): void => {
    points.delete(event.pointerId)
    if (points.size === 0) {
      mode = 'idle'
      primaryId = null
    }
  }

  // WINDOW capture: earlier in the propagation path than the document, so a
  // scroll gesture is stopped before Univer's range-drag handler (or anything
  // else) sees the moves. A tap never stops, so cell selection keeps working.
  const options: AddEventListenerOptions = { capture: true, passive: true }
  window.addEventListener('pointerdown', onDown, options)
  window.addEventListener('pointermove', onMove, options)
  window.addEventListener('pointerup', onUp, options)
  window.addEventListener('pointercancel', onCancel, options)
  window.addEventListener('touchmove', onTouchMove, { capture: true, passive: true })
  window.addEventListener('touchend', onTouchEnd, { capture: true, passive: true })

  const dispose = (): void => {
    window.removeEventListener('pointerdown', onDown, options)
    window.removeEventListener('pointermove', onMove, options)
    window.removeEventListener('pointerup', onUp, options)
    window.removeEventListener('pointercancel', onCancel, options)
    window.removeEventListener('touchmove', onTouchMove, { capture: true })
    window.removeEventListener('touchend', onTouchEnd, { capture: true })
    points.clear()
    installed = null
  }
  installed = dispose
  return dispose
}
