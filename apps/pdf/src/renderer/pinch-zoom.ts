/**
 * Two-finger pinch zoom for the PDF reader.
 *
 * The viewer has its own scale and an anchored Ctrl+wheel path; on a phone the
 * browser takes the pinch for page zoom (the whole UI magnifies, text reflows off
 * screen) and the page itself never zooms. So the element owns the gesture:
 * touch-action pan-x pan-y keeps one-finger scrolling and denies the browser the
 * pinch, and the pinch is replayed onto the existing Ctrl+wheel handler at the
 * midpoint, so the zoom is anchored where the fingers are.
 */

const PINCH_GAIN = 0.9

export function installPdfPinchZoom(el: HTMLElement): () => void {
  let active = false
  let distance = 0

  const spread = (touches: TouchList): number =>
    Math.hypot(touches[0]!.clientX - touches[1]!.clientX, touches[0]!.clientY - touches[1]!.clientY)

  const onStart = (event: TouchEvent): void => {
    if (event.touches.length !== 2) return
    active = true
    distance = spread(event.touches)
  }

  const onMove = (event: TouchEvent): void => {
    if (!active || event.touches.length < 2) return
    // own the gesture: no page zoom, no rubber-band
    event.preventDefault()
    const next = spread(event.touches)
    if (next < 1) return
    const midX = (event.touches[0]!.clientX + event.touches[1]!.clientX) / 2
    const midY = (event.touches[0]!.clientY + event.touches[1]!.clientY) / 2
    // spreading (distance up) zooms in: the wheel path reads a negative deltaY as in
    const delta = (distance - next) * PINCH_GAIN
    distance = next
    if (Math.abs(delta) < 0.5) return
    el.dispatchEvent(
      new WheelEvent('wheel', {
        deltaY: delta,
        ctrlKey: true,
        clientX: midX,
        clientY: midY,
        bubbles: true,
        cancelable: true,
      }),
    )
  }

  const onEnd = (event: TouchEvent): void => {
    if (event.touches.length < 2) active = false
  }

  el.addEventListener('touchstart', onStart, { passive: true })
  el.addEventListener('touchmove', onMove, { passive: false })
  el.addEventListener('touchend', onEnd, { passive: true })
  el.addEventListener('touchcancel', onEnd, { passive: true })

  return () => {
    el.removeEventListener('touchstart', onStart)
    el.removeEventListener('touchmove', onMove)
    el.removeEventListener('touchend', onEnd)
    el.removeEventListener('touchcancel', onEnd)
  }
}
