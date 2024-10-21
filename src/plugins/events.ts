/* eslint-disable dot-notation */
import { Event } from '../primitives'
import type { Plugin, PluginContext } from '../primitives'

const primitiveEvents = ['click', 'mousedown', 'mousemove', 'mouseup', 'mouseover', 'mouseout'] as const

export type PrimitiveEvent = typeof primitiveEvents[number]

export type PrimitiveEventDefinition = Record<PrimitiveEvent, any>

function installEventForApplication(app: PluginContext) {
  const event = new Event<PrimitiveEventDefinition>()
  const { instance } = app.render
  const mm = Object.getOwnPropertyNames(Object.getPrototypeOf(event))
  while (mm.length) {
    const m = mm.shift()
    if (m === 'constructor') continue
    Object.defineProperty(instance, m!, {
      // @ts-expect-error
      value: event[m!].bind(event),
      writable: false
    })
  }
  // bind event to app
  const canvas = instance['canvas']!
  const ctx = instance['ctx']!

  for (const evt of primitiveEvents) {
    // event.on(evt, () => {}, app.render)
  }
}

export const events: Plugin = {
  name: 'preset:events',
  order: 'pre',
  install(app) {
    installEventForApplication(app)
  }
}
