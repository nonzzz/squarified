import { Component } from '../component'
import { log } from '../etoile/native/log'
import type { ColorDecoratorResult } from '../etoile/native/runtime'
import { ColorMappings } from '../interface'
import { DOMEvent } from './dom-event'
import type { LayoutModule } from './squarify'

export type PluginHandlder = (app: Component, evt: DOMEvent) => void

export type PluginContext = {
  setColorScheme: (id: string, color: ColorDecoratorResult) => void
}

type SchemeHooks = {
  color: (nodes: LayoutModule[]) => ColorMappings
}

export type PluginScheme = {
  [K in keyof SchemeHooks]?: (this: PluginContext, ...args: Parameters<SchemeHooks[K]>) => ReturnType<SchemeHooks[K]>
}

export interface Plugin<T = string> {
  name: T
  handler?: PluginHandlder
  scheme?: PluginScheme
}

export function definePlugin<T extends string, P extends Plugin<T>>(plugin: P) {
  return plugin
}

function createPluginContext(c: Component) {
  const setColorScheme = (id: string, color: ColorDecoratorResult) => {
    c.colorScheme[id] = color
  }

  const ctx = { setColorScheme }

  return ctx
}

export class PluginDriver {
  private plugins: Map<string, Plugin> = new Map()
  private component: Component
  private pluginContext: ReturnType<typeof createPluginContext>
  constructor(component: Component) {
    this.component = component
    this.pluginContext = createPluginContext(this.component)
  }
  use(plugin: Plugin) {
    if (!plugin.name) {
      throw new Error(log.error('Plugin name is required'))
    }
    if (this.plugins.has(plugin.name)) {
      throw new Error(log.error(`Plugin ${plugin.name} is already registered`))
    }
    this.plugins.set(plugin.name, plugin)
  }
  seqScheme<K extends keyof SchemeHooks>(
    hookName: K,
    ...args: Parameters<SchemeHooks[K]>
  ): ReturnType<SchemeHooks[K]> {
    let result
    this.plugins.forEach((plugin) => {
      if (plugin.scheme?.[hookName]) {
        result = plugin.scheme[hookName].apply(this.pluginContext, args)
      }
    })
    return result as ReturnType<SchemeHooks[K]>
  }
  runHandler(evt: DOMEvent) {
    this.plugins.forEach((plugin) => {
      if (plugin.handler) {
        plugin.handler(this.component, evt)
      }
    })
  }
}
