import { Component, logger } from '../component'
import type { ColorMappings } from '../component'
import type { BasicTreemapInstance } from '../index'
import type { LayoutModule } from '../primitives/squarify'
import type { NativeModule } from '../primitives/struct'
import { typedForIn } from './index'

export type PluginContext = {
  resolveModuleById: (this: Component, id: string) => LayoutModule | null
}

export interface OnModuleInitResult {
  colorMappings?: ColorMappings
}

export interface PluginHooks {
  onLoad?: (this: PluginContext, treemapContext: BasicTreemapInstance) => void | Record<string, Any>
  onModuleInit?: (this: PluginContext, modules: NativeModule[]) => OnModuleInitResult | void
}

export type BasicPluginHooks = Pick<PluginHooks, 'onLoad'>

export type CascadedPluginHooks = Pick<PluginHooks, 'onModuleInit'>

export interface Plugin<T = string> extends PluginHooks {
  name: T
}

export function definePlugin<T extends string, P extends Plugin<T>>(plugin: P) {
  return plugin
}

const pluginContextStaticMethods: PluginContext = {
  resolveModuleById(id: string) {
    // console.log(this., id)
    return {}
  }
}

export class PluginDriver<T extends Component> {
  private plugins: Map<string, Plugin> = new Map()
  private pluginContext: PluginContext
  private component: T
  constructor(component: T) {
    this.component = component
    this.pluginContext = { ...pluginContextStaticMethods }
    typedForIn(this.pluginContext, (name, fn) => this.pluginContext[name] = fn.bind(this.component))
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
        hook.call(this.pluginContext, ...args)
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
}
