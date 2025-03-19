import { Component } from './component'
import { Event } from './etoile'
import type { BindThisParameter } from './etoile'
import { log } from './etoile/native/log'
import { DOMEvent } from './primitives/dom-event'
import type { DOMEventMetadata, DOMEventType } from './primitives/dom-event'
import { Plugin } from './primitives/fly'
import { Module, bindParentForModule } from './primitives/struct'
import { InheritedCollections, mixin } from './shared'

export interface CreateTreemapOptions {
  plugins?: Plugin[]
}

export interface SetOptions {
  data: Module[]
}

export type ExposedEventDefinition = {
  [K in DOMEventType]: BindThisParameter<(metadata: DOMEventMetadata<K>) => void, unknown>
}

export interface ExposedEventMethods<C = Any, D = ExposedEventDefinition> {
  on<Evt extends keyof D>(
    evt: Evt,
    handler: BindThisParameter<D[Evt], unknown extends C ? this : C>
  ): void
  off<Evt extends keyof D>(
    evt: keyof D,
    handler?: BindThisParameter<D[Evt], unknown extends C ? this : C>
  ): void
}

export function createTreemapV2(options: CreateTreemapOptions = {}) {
  let component: Component | null = null
  let root: HTMLElement | null = null
  let installed = false
  let domEvent: DOMEvent | null = null

  const exposedEvent = new Event()

  const exposedMethods: InheritedCollections[] = [
    { name: 'on', fn: () => exposedEvent.bindWithContext({}) },
    { name: 'off', fn: () => exposedEvent.off.bind(exposedEvent) }
  ]

  const { plugins = [] } = options

  const context = {
    init,
    dispose,
    setOptions,
    resize
  }

  function init(el: HTMLElement) {
    component = new Component(el)
    root = el
    ;(root as HTMLDivElement).style.position = 'relative'
    if (!installed) {
      for (const plugin of plugins) {
        component.pluginDriver.use(plugin)
      }
      domEvent = new DOMEvent(component)
      installed = true
      domEvent.on('__exposed__', (type, metadata) => exposedEvent.emit(type, metadata))
      component.pluginDriver.runHandler(domEvent)
    }
  }
  function dispose() {
    if (root && component && domEvent) {
      domEvent.destory()
      component.destory()
      root.removeChild(root.firstChild!)

      for (const evt in exposedEvent.eventCollections) {
        exposedEvent.off(evt)
      }
      root = null
      component = null
      domEvent = null
    }
  }

  function resize() {
    if (!component || !root) { return }
    const { width, height } = root.getBoundingClientRect()
    component.render.initOptions({ height, width, devicePixelRatio: window.devicePixelRatio })
    component.render.canvas.style.position = 'absolute'
    component.cleanup()
    component.draw()
  }

  function setOptions(options: SetOptions) {
    if (!component) {
      throw new Error(log.error('Treemap not initialized. Please call init() first.'))
    }
    component.data = bindParentForModule(options.data || [])
    resize()
  }

  return mixin<typeof context, ExposedEventMethods>(context, exposedMethods)
}

export * from './primitives/fly'
