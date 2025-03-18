import { Component } from './component'
import { log } from './etoile/native/log'
import { Plugin } from './primitives/fly'
import { Module, bindParentForModule } from './primitives/struct'

export interface CreateTreemapOptions {
  plugins?: Plugin[]
}

export interface SetOptions {
  data: Module[]
}

export function createTreemapV2(options: CreateTreemapOptions = {}) {
  let component: Component | null = null
  let root: HTMLElement | null = null
  let installed = false

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
      installed = true
    }
  }
  function dispose() {
    if (root && component) {
      component.destory()
      root.removeChild(root.firstChild!)
      root = null
      component = null
    }
  }

  function resize() {
    if (!component || !root) { return }
    const { width, height } = root.getBoundingClientRect()
    component.render.initOptions({ height, width, devicePixelRatio: window.devicePixelRatio })
    component.render.canvas.style.position = 'absolute'
    component.draw()
  }

  function setOptions(options: SetOptions) {
    if (!component) {
      throw new Error(log.error('Treemap not initialized. Please call init() first.'))
    }
    component.data = bindParentForModule(options.data || [])
    resize()
  }

  return context
}

export * from './interface'
export * from './primitives/fly'
