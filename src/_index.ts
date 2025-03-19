import { Component } from './component'
import { Event } from './etoile'
import type { BindThisParameter } from './etoile'
import { log } from './etoile/native/log'
import { DOMEvent } from './primitives/dom-event'
import type { DOMEventMetadata, DOMEventType } from './primitives/dom-event'
import { Plugin } from './primitives/fly'
import { Module, bindParentForModule } from './primitives/struct'
import { mixin } from './shared'

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

type PluginHelp<T extends Plugin[]> = T extends [infer L, ...infer R]
  ? L extends Plugin ? ReturnType<NonNullable<L['handler']>> extends void ? Record<string, never>
    : R extends Plugin[] ? ReturnType<NonNullable<L['handler']>> & PluginHelp<R>
    : Record<string, never>
  : Record<string, never>
  : Record<string, never>

export function createTreemapV2<const T extends Plugin[]>(options: { plugins: T } = { plugins: [] as unknown as T }) {
  let component: Component | null = null
  let root: HTMLElement | null = null
  let installed = false
  let domEvent: DOMEvent | null = null

  const exposedEvent = new Event()

  const { plugins = [] } = options

  if (!Array.isArray(plugins)) {
    throw new Error(log.error('Plugins must be an array.'))
  }

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
      domEvent.on('__exposed__', (type, ...args) => exposedEvent.emit(type, ...args))
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

  const base = mixin(context, [
    { name: 'on', fn: () => exposedEvent.bindWithContext({}) },
    { name: 'off', fn: () => exposedEvent.off.bind(exposedEvent) }
  ])

  return base as typeof base & ExposedEventMethods & PluginHelp<T>
}

export * from './primitives/fly'
