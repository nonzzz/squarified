import type { PaintEvent, TreemapContext } from './interface'

export interface EventHandlersEventMap {
  mousemove: MouseEvent
  click: Event
  wheel: WheelEvent
}

function onwheel(this: TreemapContext, event: WheelEvent) {}

function onmousemove(this: TreemapContext, event: MouseEvent) {
}

function onclick(this: TreemapContext, event: Event) {
  console.log(event)
}

export const primitiveEvents = {
  onclick,
  onmousemove,
  onwheel
}

export type PrimitiveEventType = keyof typeof primitiveEvents

export type EventType = keyof typeof primitiveEvents extends `on${infer R}` ? R : never

export type PrimitiveEventMap = typeof primitiveEvents

export type PrimitiveHandler = PrimitiveEventMap[keyof PrimitiveEventMap]

export type PaintEventMap<K extends EventType = EventType> = Record<
  K,
  (this: TreemapContext, evetn: PaintEvent<EventHandlersEventMap[K]>) => void
>

export type EventKind = EventHandlersEventMap[EventType]
