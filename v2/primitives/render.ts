// When i finished the v1 version. I notice that we can't do any tree shake on the code.
// So i decided to create a plug-in architecture for the treemap component.

import { isObject } from '../../src/shared'
import type { Plugin, PluginContext } from './interface'
import { type LayoutModule, squarify } from './squarify'
import { bindParentForModule } from './struct'
import type { Module, NativeModule } from './struct'

export interface AppOptions {
  data: Module[]
}

export type ColorMappings = Record<string, string>

export type Rect = { w: number; h: number }

export interface RenderColor {
  mappings: ColorMappings
}

export interface RenderLayout {
  titleAreaHeight: number
  rectBorderRadius: number
  rectBorderWidth: number
  rectGap: number
}

export interface RenderDecorator {
  color: RenderColor
  layout: RenderLayout
}

// TODO: implement a render engine

class Render {
  private mountNode: Element | null
  private canvas: HTMLCanvasElement | null
  private ctx: CanvasRenderingContext2D | null
  protected renderDecorator: RenderDecorator
  protected data: NativeModule[]
  private layoutNodes: LayoutModule[]
  private rect: Rect
  constructor() {
    this.mountNode = null
    this.canvas = null
    this.ctx = null
    this.renderDecorator = Object.create(null)
    this.rect = { w: 0, h: 0 }
    this.data = []
    this.layoutNodes = []
  }

  private draw() {}

  private deinit(release?: boolean) {
    if (!this.mountNode) return
    if (this.canvas) this.mountNode.removeChild(this.canvas)
    if (release) {
      this.mountNode = null
    }
    this.canvas = null
    this.rect = { w: 0, h: 0 }
    this.data = []
    this.layoutNodes = []
    this.ctx = null
  }

  private isReady() {
    return this.mountNode && this.canvas
  }

  protected setRenderDecorator(decorator: Partial<RenderDecorator> = {}) {
    Object.assign(this.renderDecorator, decorator)
  }

  protected mounted(data: NativeModule[], options: Omit<AppOptions, 'data'>) {
    if (this.isReady() && !data.length) {
      this.deinit()
      return
    }
    if (!this.canvas && this.mountNode) {
      this.init(this.mountNode)
    }
    this.data = data
    // event collections
    this.resize()
  }

  dispose() {
    this.deinit(true)
    this.renderDecorator = Object.create(null)
  }

  init(element: Element) {
    this.deinit(true)
    this.mountNode = element
    this.canvas = document.createElement('canvas')
    this.ctx = this.canvas.getContext('2d')
    this.mountNode.appendChild(this.canvas)
  }

  resize() {
    if (!this.mountNode || !this.canvas || !this.ctx) return
    const previousW = this.rect.w
    const previousH = this.rect.h
    const { width, height } = this.mountNode.getBoundingClientRect()
    this.rect = { w: width, h: height }
    const pixelRatio = window.devicePixelRatio || 1
    this.canvas.width = Math.round(height * pixelRatio)
    this.canvas.height = Math.round(width * pixelRatio)
    this.canvas.style.cssText = `width: ${width}px; height: ${height}px`
    this.ctx.scale(pixelRatio, pixelRatio)
    if (previousW !== width || previousH !== height) {
      this.layoutNodes = squarify(this.data, { ...this.rect, x: 0, y: 0 })
    }
    this.draw()
  }
}

export class App extends Render {
  private plugins: WeakSet<Plugin<any>>
  constructor() {
    super()
    this.plugins = new WeakSet()
  }

  get render() {
    return {
      data: this.data
    }
  }

  get pluginContext() {
    const c = this
    return {
      render: this.render,
      setRenderDecorator: this.setRenderDecorator.bind(c)
    } satisfies PluginContext
  }

  use<Options>(plugin: Plugin<Options>, options?: Options) {
    if (!this.plugins.has(plugin)) {
      if (plugin && isObject(plugin) && typeof plugin.install === 'function') {
        plugin.install(this.pluginContext, options)
        this.plugins.add(plugin)
      }
    }
    return this
  }

  setOptions(options?: AppOptions) {
    if (!options) return
    const { data, ...rest } = options
    this.mounted(bindParentForModule(options.data), rest)
  }
}
