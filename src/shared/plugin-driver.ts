import { Component, logger } from '../component'
import type { ColorMappings } from '../component'
import { DOMEvent } from '../dom-event'
import type { DOMEventMetadata, DOMEventType } from '../dom-event'
import type { BasicTreemapInstance } from '../index'
import type { LayoutModule } from '../primitives/squarify'
import { findRelativeNodeById } from '../primitives/struct'

export interface PluginContext {
  resolveModuleById: (id: string) => LayoutModule | null
  getPluginMetadata: <M = Any>(pluginName: string) => M | null
  get instance(): Component
}

export interface OnModuleInitResult {
  colorMappings?: ColorMappings
}

export interface PluginHooks {
  onLoad?: (this: PluginContext, treemapContext: BasicTreemapInstance) => void | Record<string, Any>
  onModuleInit?: (this: PluginContext, modules: LayoutModule[]) => OnModuleInitResult | void
  onDOMEventTriggered?: <N extends DOMEventType>(
    this: PluginContext,
    name: N,
    event: DOMEventMetadata<N>,
    module: LayoutModule | null,
    domEvent: DOMEvent
  ) => void
  onResize?: (this: PluginContext, domEvent: DOMEvent) => void
  onDispose?: (this: PluginContext) => void
}

export type BasicPluginHooks = Pick<PluginHooks, 'onLoad' | 'onDOMEventTriggered' | 'onResize' | 'onDispose'>

export type CascadedPluginHooks = Pick<PluginHooks, 'onModuleInit'>

export interface Plugin<T = string, M = Any> extends PluginHooks {
  name: T
  meta?: M
}

export function definePlugin<
  T extends string = string,
  M = Any,
  P extends Plugin<T, M> = Plugin<T, M>
>(plugin: P): P {
  return plugin
}

export class PluginDriver<T extends Component> {
  private plugins: Map<string, Plugin> = new Map()
  private pluginContext: PluginContext
  constructor(component: T) {
    this.pluginContext = {
      resolveModuleById(id: string) {
        return findRelativeNodeById(id, component.layoutNodes)
      },
      getPluginMetadata: <M = Any>(pluginName: string) => {
        return this.getPluginMetadata<M>(pluginName)
      },
      get instance() {
        return component
      }
    }
  }
  use(plugin: Plugin) {
    if (!plugin.name) {
      logger.error('Plugin name is required')
      return
    }
    if (this.plugins.has(plugin.name)) {
      logger.panic(`Plugin ${plugin.name} is already registered`)
    }
    this.plugins.set(plugin.name, plugin)
  }

  runHook<K extends keyof BasicPluginHooks>(hookName: K, ...args: Parameters<NonNullable<BasicPluginHooks[K]>>) {
    this.plugins.forEach((plugin) => {
      const hook = plugin[hookName]
      if (hook) {
        // @ts-expect-error fixme
        hook.apply(this.pluginContext, args)
      }
    })
  }

  cascadeHook<K extends keyof CascadedPluginHooks>(
    hookName: K,
    ...args: Parameters<NonNullable<CascadedPluginHooks[K]>>
  ): ReturnType<NonNullable<CascadedPluginHooks[K]>> {
    const finalResult = {}

    this.plugins.forEach((plugin) => {
      const hook = plugin[hookName]
      if (hook) {
        const hookResult = hook.call(this.pluginContext, ...args)
        if (hookResult) {
          Object.assign(finalResult, hookResult)
        }
      }
    })

    return finalResult as ReturnType<NonNullable<CascadedPluginHooks[K]>>
  }

  getPluginMetadata<M = Any>(pluginName: string): M | null {
    const plugin = this.plugins.get(pluginName)
    return (plugin?.meta as M) || null
  }
}
