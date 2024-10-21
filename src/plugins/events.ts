/* eslint-disable dot-notation */
import { Event, findRelativeNode } from '../primitives'
import type { App, BindThisParameter, NativeModule, Plugin, PluginContext, Render } from '../primitives'

const primitiveEvents = ['click', 'mousedown', 'mousemove', 'mouseup', 'mouseover', 'mouseout'] as const

export type PrimitiveEvent = typeof primitiveEvents[number]

export interface PrimitiveEventMetadata<T extends keyof HTMLElementEventMap> {
  native: HTMLElementEventMap[T]
  module: NativeModule
}

export type PrimitiveEventCallback<T extends PrimitiveEvent> = (metadata: PrimitiveEventMetadata<T>) => void

export type PrimitiveEventDefinition = Record<PrimitiveEvent, BindThisParameter<PrimitiveEvent, Render>>

function bindPrimitiveEvent(c: HTMLCanvasElement, instance: App) {
  for (let i = 0; i < primitiveEvents.length; i++) {
    const evt = primitiveEvents[i]
    c.addEventListener(evt, (e) => {
      const metadata = <PrimitiveEventMetadata<PrimitiveEvent>> {
        native: e,
        module: findRelativeNode(c, { x: e.pageX, y: e.pageY }, instance['layoutNodes'])
      }
      // @ts-expect-error
      instance.emit(evt, metadata)
    })
  }
}

interface InheritedCollections {
  name: string
  fn: (instance: App) => void
}

function installEventForApplication(app: PluginContext) {
  const event = new Event<PrimitiveEventDefinition>()
  const { instance } = app.render
  const methods: InheritedCollections[] = [
    {
      name: 'on',
      fn: (instance: App) => event.bindWithContext(instance.render).bind(event)
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

  methods.forEach(({ name, fn }) => {
    Object.defineProperty(instance, name, {
      value: fn(instance),
      writable: false
    })
  })

  // bind event to app
  const canvas = instance['canvas']!
  bindPrimitiveEvent(canvas, instance)
}

export const events: Plugin = {
  name: 'preset:events',
  order: 'pre',
  install(app) {
    installEventForApplication(app)
  }
}
