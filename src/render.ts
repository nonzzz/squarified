import type { PaintEventMap, PaintRect, PaintView, Treemap, TreemapContext, TreemapOptions } from './interface'
import type { SquarifiedModule, SquarifiedModuleWithLayout } from './primitives'
import { Iter, isObject } from './shared'
import { squarify } from './primitives'

type PrimitivePaintEventMapUnion = keyof PaintEventMap | (string & {})

interface EventCollection {
  name: string
  handler: EventListener
}

function createPaintEventHandler(canvas: HTMLCanvasElement, eventType: PrimitivePaintEventMapUnion, handler: EventListener) {
  canvas.addEventListener(eventType, handler)
  return { handler }
}

function handleColorMappings(data: SquarifiedModule[], decorator?: PaintView['colorDecorator']) {
  return {}
}

class Paint implements Treemap {
  private mountedNode: HTMLDivElement | null
  private _canvas: HTMLCanvasElement | null
  private _context: CanvasRenderingContext2D | null
  private rect: PaintRect
  private data: SquarifiedModule[]
  private layoutNodes: SquarifiedModuleWithLayout[]
  private eventCollections: EventCollection[]
  private colorsMappings: Record<string, string>
  constructor() {
    this.mountedNode = null
    this._canvas = null
    this._context = null
    this.rect = { w: 0, h: 0 }
    this.data = []
    this.layoutNodes = []
    this.eventCollections = []
    this.colorsMappings = {}
  }

  private bindEvent(type: PrimitivePaintEventMapUnion, evt: Event, userHandler: PaintEventMap[keyof PaintEventMap]) {
    switch (type) {
      case 'mousemove':
        break
    }
    userHandler.call(this.context, {
      // @ts-expect-error
      nativeEvent: evt,
      module: {}
    })
  }

  private deinitEventCollections() {
    if (this.eventCollections.length) {
      while (true) {
        if (!this.eventCollections.length) break
        const { name, handler } = this.eventCollections.shift()!
        this.canvas.removeEventListener(name, handler)
      }
    }
  }

  private deinit(release = true) {
    if (!this.mountedNode) return
    this.deinitEventCollections()
    this.mountedNode.removeChild(this._canvas!)
    if (release) {
      this.mountedNode = null
    }
    this._canvas = null
    this._context = null
    this.data = []
    this.layoutNodes = []
    this.colorsMappings = {}
    this.rect = { w: 0, h: 0 }
  }

  private draw() {}

  private get canvas() {
    if (!this._canvas) throw new Error('Canvas not initialized')
    return this._canvas
  }

  //   notice the difference in the following two snippets
  //   ctx is the canvas context
  //   context is a special paint context
  private get ctx() {
    if (!this._context) throw new Error('Context not initialized')
    return this._context
  }

  private get context() {
    return {
      zoom: this.zoom
    } satisfies TreemapContext
  }

  zoom() {
  }

  init(element: HTMLDivElement) {
    this.deinit(true)
    this.mountedNode = element
    this._canvas = document.createElement('canvas')
    this._context = this._canvas.getContext('2d')
    this.mountedNode.appendChild(this.canvas)
    return this
  }

  dispose() {
    this.deinit(true)
  }

  resize() {
    if (!this.mountedNode) return
    const previousRect = { ...this.rect }
    const pixelRatio = window.devicePixelRatio || 1
    const { width, height } = this.mountedNode.getBoundingClientRect()
    this.rect = { w: width, h: height }
    this.canvas.height = Math.round(height * pixelRatio)
    this.canvas.width = Math.round(width * pixelRatio)
    this.canvas.style.cssText = `width: ${width}px; height: ${height}px`
    this.ctx.scale(pixelRatio, pixelRatio)
    if (previousRect.w !== width || previousRect.h !== height) {
      this.layoutNodes = squarify(this.data, this.rect)
    }
    this.draw()
  }

  setOptions(options?: TreemapOptions) {
    if (!options) return
    const { evt: userEvent, data, view } = options
    this.data = data
    const unReady = !this.data.length
    if (unReady) {
      if (this.mountedNode && this.canvas) {
        this.deinit()
      }
      return
    }
    if (!this._canvas) {
      this.init(this.mountedNode!)
    }
    this.deinitEventCollections()
    if (userEvent) {
      for (const { key, value } of new Iter(userEvent)) {
        const { handler } = createPaintEventHandler(this.canvas, key, (e) => {
          this.bindEvent(key, e, value!)
        })
        const nativeEventName = 'on' + key
        this.eventCollections.push({ name: nativeEventName, handler })
      }
    }
    if (view && isObject(view)) {
      this.colorsMappings = handleColorMappings(this.data, view.colorDecorator)
    }
    this.resize()
  }
}

export function createTreemap() {
  return new Paint()
}
