// Note: I won't decide to support mobile devices.
// So don't create any reporting issues about mobile devices.

import { createEffectScope } from './dom'

// gesturechange and gestureend is specific for Safari
// So we only implement wheel event
// If you feel malicious on Safari (I won't fix it)

export interface WheelGesture {
  original: { x: number; y: number }
  scale: number
  translation: { x: number; y: number }
}

export interface GestureMetadata {
  native: WheelEvent
  isPanGesture: boolean
  data: WheelGesture
}

export type Ongesturestar = (metadata: GestureMetadata) => void

export type Ongesturemove = (metadata: GestureMetadata) => void

export type Ongestureend = (metadata: GestureMetadata) => void

export interface MagicTrackpadContext {
  ongesturestart: Ongesturestar
  ongesturemove: Ongesturemove
  ongestureend: Ongestureend
}

const WHEEL_SCALE_SPEEDUP = 2
const WHEEL_TRANSLATION_SPEEDUP = 2
const DELTA_LINE_MULTIPLIER = 8
const DELTA_PAGE_MULTIPLIER = 24
const MAX_WHEEL_DELTA = 24

function limit(delta: number, max: number) {
  return Math.sign(delta) * Math.min(max, Math.abs(delta))
}

export function normalizeWheel(e: WheelEvent) {
  let dx = e.deltaX
  let dy = e.deltaY
  if (e.shiftKey && dx === 0) {
    ;[dx, dy] = [dy, dx]
  }
  if (e.deltaMode === WheelEvent.DOM_DELTA_LINE) {
    dx *= DELTA_LINE_MULTIPLIER
    dy *= DELTA_LINE_MULTIPLIER
  } else if (e.deltaMode === WheelEvent.DOM_DELTA_PAGE) {
    dx *= DELTA_PAGE_MULTIPLIER
    dy *= DELTA_PAGE_MULTIPLIER
  }
  return [limit(dx, MAX_WHEEL_DELTA), limit(dy, MAX_WHEEL_DELTA)]
}

export function useMagicTrackpad(el: HTMLElement, c: MagicTrackpadContext) {
  let wheelGesture: WheelGesture = null as unknown as WheelGesture
  let lastTime = 0

  const effect = createEffectScope()

  const handler = (e: WheelEvent) => {
    if (e.cancelable !== false) {
      e.preventDefault()
    }
    const isPanGesture = !e.ctrlKey
    const [dx, dy] = normalizeWheel(e)
    if (!wheelGesture) {
      wheelGesture = {
        original: { x: e.clientX, y: e.clientY },
        scale: 1,
        translation: { x: 0, y: 0 }
      }
      c.ongesturestart({ data: wheelGesture, isPanGesture, native: e })
    }
    if (e.ctrlKey) {
      // pinch-zoom gesture
      const factor = dy <= 0
        ? 1 - WHEEL_SCALE_SPEEDUP * dy / 100
        : 1 / (1 + WHEEL_SCALE_SPEEDUP * dy / 100)
      wheelGesture = {
        original: { x: e.clientX, y: e.clientY },
        scale: wheelGesture.scale * factor,
        translation: wheelGesture.translation
      }
    } else {
      // pan gesture
      wheelGesture = {
        original: { x: e.clientX, y: e.clientY },
        scale: wheelGesture.scale,
        translation: {
          x: wheelGesture.translation.x -
            WHEEL_TRANSLATION_SPEEDUP * dx,
          y: wheelGesture.translation.y -
            WHEEL_TRANSLATION_SPEEDUP * dy
        }
      }
    }
    c.ongesturemove({ data: wheelGesture, isPanGesture, native: e })

    effect.run(() => {
      const now = Date.now()
      if (now - lastTime >= 200) {
        if (wheelGesture) {
          c.ongestureend({ data: wheelGesture, isPanGesture, native: e })
          wheelGesture = null as unknown as WheelGesture
        }
      } else {
        effect.stop()
      }
      lastTime = Date.now()
    })
  }
  el.addEventListener('wheel', handler, { passive: false })

  return handler
}
