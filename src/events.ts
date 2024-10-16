import type { TreemapContext } from './interface'

function onwheel() {}

function onmousemove(this: TreemapContext, event: Event) {
}

export const primitiveEvents = {
  // onwheel,
  onmousemove
}

export type PrimitiveEventType = keyof typeof primitiveEvents

export type EventType = keyof typeof primitiveEvents extends `on${infer R}` ? R : never

export type PrimitiveEventMap = typeof primitiveEvents

export type PrimitiveHandler = PrimitiveEventMap[keyof PrimitiveEventMap]
