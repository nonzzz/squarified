import { charCodeWidth, evaluateOptimalFontSize, getSafeText } from '../plugins/layout'
import { isObject, noop } from '../shared'
import type { Plugin, PluginContext } from './interface'
import { type LayoutModule, squarify } from './squarify'
import { bindParentForModule } from './struct'
import type { Module, NativeModule } from './struct'
import { Event } from './events'
import { mouseWheel } from './zoomable'

type AppOwnEvents = Record<string, EventListener>

export interface AppOptions {
  data: Module[]
}

export type ColorMappings = Record<string, string>

export type Rect = { w: number; h: number }

export type Series<T> = {
  max: T
  min: T
}

export interface RenderColor {
  mappings: ColorMappings
}

export interface RenderLayout {
  titleAreaHeight: Series<number>
  rectBorderRadius: number
  rectBorderWidth: number
  rectGap: number
}

export interface RenderFont {
  color: string
  fontSize: Series<number>
  fontFamily: string
}

export interface RenderDecorator {
  color: RenderColor
  layout: RenderLayout
  font: RenderFont
}

// For some reasons i think it's make sense to impl zoom or other wheel event in App.
export interface Render {
  data: NativeModule[]
  zoom: () => void
  [key: string]: any
}

// TODO: implement a render engine

export class App {
  private plugins: Map<string, { order: string; fn: () => any }>
  private _processedPlugins: Record<'pre' | 'post', Array<() => any>>
  private mountNode: Element | null
  private canvas: HTMLCanvasElement | null
  private ctx: CanvasRenderingContext2D | null
  protected renderDecorator: RenderDecorator
  protected data: NativeModule[]
  private layoutNodes: LayoutModule[]
  private rect: Rect
  private event: Event

  constructor() {
    this.mountNode = null
    this.canvas = null
    this.ctx = null
    this.renderDecorator = Object.create(null)
    this.rect = { w: 0, h: 0 }
    this.data = []
    this.layoutNodes = []
    this._processedPlugins = Object.create(null)
    this.plugins = new Map()
    this.event = new Event<AppOwnEvents>()
  }

  private drawRoundedRect(x: number, y: number, w: number, h: number, r: number) {
    if (!this.ctx) return
    this.ctx.beginPath()
    this.ctx.moveTo(x + r, y)
    this.ctx.lineTo(x + w - r, y)
    this.ctx.quadraticCurveTo(x + w, y, x + w, y + r)
    this.ctx.lineTo(x + w, y + h - r)
    this.ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h)
    this.ctx.lineTo(x + r, y + h)
    this.ctx.quadraticCurveTo(x, y + h, x, y + h - r)
    this.ctx.lineTo(x, y + r)
    this.ctx.quadraticCurveTo(x, y, x + r, y)
    this.ctx.closePath()
    this.ctx.fill()
  }

  private drawBackgroundNode(node: LayoutModule) {
    if (!this.ctx) return
    for (const child of node.children) {
      this.drawBackgroundNode(child)
    }
    const [x, y, w, h] = node.layout
    const { rectGap, rectBorderRadius, rectBorderWidth, titleHeight } = node.decorator
    this.ctx.lineWidth = rectBorderWidth
    this.ctx.fillStyle = this.renderDecorator.color.mappings[node.node.id]
    this.ctx.strokeStyle = '#222'
    if (node.children.length) {
      // Draw top bar with border radius
      this.drawRoundedRect(x, y, w, titleHeight, rectBorderRadius)
      // Draw bottom bar with border radius
      this.drawRoundedRect(x, y + h - rectGap, w, rectGap, rectBorderRadius)
      // Draw left bar with border radius
      this.drawRoundedRect(x, y + titleHeight, rectGap, h - titleHeight - rectGap, rectBorderRadius)
      // Draw right bar with border radius
      this.drawRoundedRect(x + w - rectGap, y + titleHeight, rectGap, h - titleHeight - rectGap, rectBorderRadius)
    } else {
      this.drawRoundedRect(x, y, w, h, rectBorderRadius)
    }
  }

  private drawForegroundNode(node: LayoutModule) {
    if (!this.ctx) return
    for (const child of node.children) {
      this.drawForegroundNode(child)
    }
    const [x, y, w, h] = node.layout
    const { rectBorderWidth, titleHeight, rectGap } = node.decorator
    this.ctx.strokeStyle = '#222'
    const { fontSize, fontFamily, color } = this.renderDecorator.font
    this.ctx.lineWidth = rectBorderWidth
    this.ctx.strokeRect(x + 0.5, y + 0.5, w, h)
    this.ctx.fillStyle = color
    this.ctx.textBaseline = 'middle'
    const optimalFontSize = evaluateOptimalFontSize(
      this.ctx,
      node.node.label,
      w - (rectGap * 2),
      fontSize,
      fontFamily,
      node.children.length ? Math.round(titleHeight / 2) + rectGap : h
    )
    this.ctx.font = `${optimalFontSize}px ${fontFamily}`
    if (h > titleHeight) {
      const result = getSafeText(this.ctx, node.node.label, w - (rectGap * 2))
      if (!result) return
      const { text, width } = result
      const textX = x + Math.round((w - width) / 2)
      if (node.children.length) {
        const textY = y + Math.round(titleHeight / 2)
        this.ctx.fillText(text, textX, textY)
      } else {
        const textY = y + Math.round(h / 2)
        this.ctx.fillText(text, textX, textY)
      }
    } else {
      const ellipsisWidth = 3 * charCodeWidth(this.ctx, 46)
      const textX = x + Math.round((w - ellipsisWidth) / 2)
      const textY = y + Math.round(h / 2)
      this.ctx.fillText('...', textX, textY)
    }
  }

  private draw() {
    this.ctx!.clearRect(0, 0, this.rect.w, this.rect.h)
    for (const node of this.layoutNodes) {
      this.drawBackgroundNode(node)
      this.drawForegroundNode(node)
    }
  }

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

  private setRenderDecorator(decorator: Partial<RenderDecorator> = {}) {
    Object.assign(this.renderDecorator, decorator)
  }

  private mounted(data: NativeModule[], options: Omit<AppOptions, 'data'>) {
    if (this.isReady() && !data.length) {
      this.deinit()
      return
    }
    if (!this.canvas && this.mountNode) {
      this.init(this.mountNode)
    }
    this.data = data
    if (this.processedPlugins.post) {
      for (const plugin of this.processedPlugins.post) {
        plugin()
      }
    }
    // event collections
    this.resize()
  }

  dispose() {
    this.deinit(true)
    this.renderDecorator = Object.create(null)
    this.event.off('mousewheel')
  }

  init(element: Element) {
    this.dispose()
    this.mountNode = element
    this.canvas = document.createElement('canvas')
    this.ctx = this.canvas.getContext('2d')
    this.mountNode.appendChild(this.canvas)
    if (this.processedPlugins.pre) {
      for (const plugin of this.processedPlugins.pre) {
        plugin()
      }
    }
    this.event.on('mousewheel', mouseWheel)
    this.canvas.addEventListener('mousewheel', (e) => {
      this.event.emit('mousewheel', this, e)
    })
  }

  resize() {
    if (!this.mountNode || !this.canvas || !this.ctx) return
    const previousW = this.rect.w
    const previousH = this.rect.h
    const { width, height } = this.mountNode.getBoundingClientRect()
    this.rect = { w: width, h: height }
    const pixelRatio = window.devicePixelRatio || 1
    this.canvas.width = Math.round(width * pixelRatio)
    this.canvas.height = Math.round(height * pixelRatio)
    this.canvas.style.cssText = `width: ${width}px; height: ${height}px`
    this.ctx.scale(pixelRatio, pixelRatio)
    if (previousW !== width || previousH !== height) {
      this.layoutNodes = squarify(this.data, { ...this.rect, x: 0, y: 0 }, this.renderDecorator.layout)
    }
    this.draw()
  }

  get render(): Render {
    return {
      data: this.data,
      /**
       * @internal for plugin use only
       */
      instance: this,
      zoom: noop
    }
  }

  get pluginContext(): PluginContext {
    const c = this
    return {
      render: this.render,
      setRenderDecorator: this.setRenderDecorator.bind(c)
    }
  }

  get processedPlugins() {
    if (!Object.keys(this._processedPlugins).length) {
      this._processedPlugins = processPlugin(this.plugins)
    }
    return this._processedPlugins
  }

  use<Options, P extends Plugin<Options>>(plugin: P, options?: Options) {
    if (plugin && isObject(plugin)) {
      const { name, install, order } = plugin
      if (!this.plugins.has(name)) {
        this.plugins.set(name, { order, fn: () => install(this.pluginContext, options) })
      }
    }
    return this as unknown as 'expand' extends keyof P ? IAPP<P['expand']> : IAPP<{}>
  }

  setOptions(options?: AppOptions) {
    if (!this.isReady()) return
    if (!options) return
    const { data, ...rest } = options
    this.mounted(bindParentForModule(options.data), rest)
  }
}

function processPlugin(plugins: Map<string, { order: string; fn: () => any }>) {
  const collections: Record<string, Array<() => any>> = {}
  plugins.forEach((plugin, _) => {
    const { order, fn } = plugin
    if (!(order in collections)) {
      collections[order] = []
    }
    collections[order].push(fn)
  })
  return collections
}

type IAPP<T> = Omit<App, 'use'> & {
  use<Options, P extends Plugin<any>>(plugin: P, options?: Options): IAPP<T & (P['expand'] & {}) >
} & T
