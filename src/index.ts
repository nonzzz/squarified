// export { TreemapLayout, createTreemap } from './primitives/component'
// export type { App, TreemapInstanceAPI, TreemapOptions, unstable_use } from './primitives/component'
// export * from './primitives/decorator'

// export type { DOMEventType } from './etoile/native/dom'
// export type { ExposedEventCallback, ExposedEventDefinition, ExposedEventMethods, PrimitiveEventMetadata } from './primitives/event'
// export type { LayoutModule } from './primitives/squarify'
export {
  c2m,
  findRelativeNode,
  findRelativeNodeById,
  flatten as flattenModule,
  getNodeDepth,
  sortChildrenByKey,
  visit
} from './primitives/struct'
// export type { Module, NativeModule } from './primitives/struct'
import { Component, logger } from './component'
import { Event } from './etoile'
import { DOMEvent } from './etoile/native/dom'
import { bindParentForModule } from './primitives/struct'
import type { Module } from './primitives/struct'
import { assertExists } from './shared/logger'
import type { Plugin } from './shared/plugin-driver'

export interface CreateTreemapOptions<P extends Plugin[]> {
  plugins: P
}

export interface TreemapOptions {
  data: Module[]
}

// type PluginMixins<P extends Plugin[]> = P extends [inter C, ...infer Rest] ? C extends Plugin ?

export function createTreemap<const P extends Plugin[]>(options?: CreateTreemapOptions<P>) {
  const { plugins = [] } = options || {}
  let root: HTMLElement | null = null
  let installed = false
  const domEvent: DOMEvent | null = null

  let component: Component | null = null

  const exposedEvents = new Event()

  if (!Array.isArray(plugins)) {
    logger.panic('Plugins should be an array')
  }

  const ctx = {
    init,
    dispose,
    resize,
    setOptions
  }

  function init(el: HTMLElement) {
    component = new Component(el)
    root = el
    ;(root as HTMLDivElement).style.position = 'relative'
    if (!installed) {
      plugins.forEach((plugin) => component?.pluginDriver.use(plugin))
      installed = true
      component.pluginDriver.runHook('onLoad')
    }
  }

  function dispose() {
    if (root && component && domEvent) {
      //
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

  function setOptions(options: TreemapOptions) {
    assertExists(component, logger, 'Treemap not initialized. Please call `init()` before setOptions.')
    component.data = bindParentForModule(options.data)
    const result = component.pluginDriver.cascadeHook('onModuleInit', component.data)
    if (result) {
      component.colorMappings = result.colorMappings!
    }
    resize()
  }

  return ctx
}

export type { Plugin, PluginContext, PluginHooks } from './shared/plugin-driver'
export { definePlugin } from './shared/plugin-driver'
