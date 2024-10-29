// etoile is a simple 2D render engine for web and it don't take complex rendering into account.
// So it's no need to implement a complex event algorithm or hit mode.
// If one day etoile need to build as a useful library. Pls rewrite it!

import { Event, Render, Schedule } from '../etoile'
import type { BindThisParameter } from '../etoile'
import type { App } from './component'
import { RegisterModule } from './registry'
import type { InheritedCollections } from './registry'
import type { NativeModule } from './struct'

const primitiveEvents = ['click', 'mousedown', 'mousemove', 'mouseup', 'mouseover', 'mouseout'] as const

export type PrimitiveEvent = typeof primitiveEvents[number]

export interface PrimitiveEventMetadata<T extends keyof HTMLElementEventMap> {
  native: HTMLElementEventMap[T]
  module: NativeModule
}

export type PrimitiveEventCallback<T extends PrimitiveEvent> = (metadata: PrimitiveEventMetadata<T>) => void

export type PrimitiveEventDefinition = {
  [key in PrimitiveEvent]: BindThisParameter<PrimitiveEventCallback<key>, any>
}

function bindPrimitiveEvent(c: HTMLCanvasElement, evt: PrimitiveEvent, bus: Event<PrimitiveEventDefinition>) {
  const handler = (e: unknown) => {
    const event = <PrimitiveEventMetadata<PrimitiveEvent>> {
      native: e
    }
    // @ts-expect-error
    bus.emit(evt, event)
  }
  c.addEventListener(evt, handler)
  return handler
}

export class SelfEvent extends RegisterModule {
  init(app: App, schedule: Schedule, render: Render): void {
    const event = new Event<PrimitiveEventDefinition>()
    const nativeEvents: any[] = []
    const methods: InheritedCollections[] = [
      {
        name: 'on',
        fn: () => event.bindWithContext(app).bind(event)
      },
      {
        name: 'off',
        fn: () => event.off.bind(event)
      },
      {
        name: 'emit',
        fn: () => event.emit.bind(event)
      }
    ]
    RegisterModule.mixin(app, methods)

    primitiveEvents.forEach((evt) => {
      nativeEvents.push(bindPrimitiveEvent(render.canvas, evt, event))
    })
  }
}
