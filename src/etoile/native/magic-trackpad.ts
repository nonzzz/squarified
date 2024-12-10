// Note: I won't decide to support mobile devices.
// So don't create any reporting issues about mobile devices.

import { createEffectScope } from './dom'

// gesturechange and gestureend is specific for Safari
// So we only implement wheel event
// If you feel malicious on Safari (I won't fix it)

export interface WheelGesture {
  original: { x: number, y: number }
  scale: number
  translation: { x: number, y: number }
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

// Notte: this only work at wheel event.

export function useMagicTrackPad(event: WheelEvent) {
  if (event.cancelable !== false) {
    event.preventDefault()
  }

  const isPanGesture = !event.ctrlKey

  //
  createEffectScope()
}
