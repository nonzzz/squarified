import type { GetAction, GroupDecorator, PaintEventMap, PaintRect, PaintView, Treemap, TreemapContext, TreemapOptions } from './interface'
import type { SquarifiedModule, SquarifiedModuleWithLayout } from './primitives'
import { Iter } from './shared'
import { squarify } from './primitives'
import { defaultColorDecorator, handleColorMappings } from './colors'

type PrimitivePaintEventMapUnion = keyof PaintEventMap | (string & {})

interface EventCollection {
  name: string
  handler: EventListener
}

function createPaintEventHandler(canvas: HTMLCanvasElement, eventType: PrimitivePaintEventMapUnion, handler: EventListener) {
  canvas.addEventListener(eventType, handler)
  return { handler }
}

function formatData(nodes: SquarifiedModule[], parent?: SquarifiedModule) {
  return nodes.map(node => {
    const next = { ...node }
    next.parent = parent
    if (node.groups && Array.isArray(node.groups)) {
      next.groups = formatData(node.groups, next)
    }
    return next
  })
}

function getDepth(node: SquarifiedModule) {
  let depth = 0
  while (node.parent) {
    node = node.parent
    depth++
  }
  return depth
}

const defaultGroupDecorator = {
  borderWidth: 4,
  borderRadius: 0.15,
  borderGap: 1
} satisfies GroupDecorator

const defaultViewOptions = {
  colorDecorator: defaultColorDecorator,
  groupDecorator: defaultGroupDecorator
} satisfies PaintView

class Paint implements Treemap {
  private mountedNode: Element | null
  private _canvas: HTMLCanvasElement | null
  private _context: CanvasRenderingContext2D | null
  private rect: PaintRect
  private data: SquarifiedModule[]
  private layoutNodes: SquarifiedModuleWithLayout[]
  private eventCollections: EventCollection[]
  private colorsMappings: Record<string, string>
  private viewConfig: Omit<PaintView, 'colorDecorator'> | null
  constructor() {
    this.mountedNode = null
    this._canvas = null
    this._context = null
    this.rect = { w: 0, h: 0 }
    this.data = []
    this.layoutNodes = []
    this.eventCollections = []
    this.colorsMappings = {}
    this.viewConfig = null
  }

  private bindEvent(type: PrimitivePaintEventMapUnion, evt: Event, userHandler: PaintEventMap[keyof PaintEventMap]) {
    switch (type) {
      case 'mousemove':
        break
    }
    userHandler.call(this.API, {
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
    this.viewConfig = null
    this.data = []
    this.layoutNodes = []
    this.colorsMappings = {}
    this.rect = { w: 0, h: 0 }
  }

  private drawNodeBackground() {
    //
  }

  private drawNodeForeground() {
  }

  private draw() {
    this.ctx.clearRect(0, 0, this.rect.w, this.rect.h)
    for (const node of this.layoutNodes) {
      this.drawNodeBackground()
    }
    for (const node of this.layoutNodes) {
      this.drawNodeForeground()
    }
  }

  private get canvas() {
    if (!this._canvas) throw new Error('Canvas not initialized')
    return this._canvas
  }

  private get ctx() {
    if (!this._context) throw new Error('Context not initialized')
    return this._context
  }

  private get API() {
    return {
      zoom: this.zoom,
      get: this.get
    } satisfies TreemapContext
  }

  private zoom() {
  }

  private get(action: GetAction, payload?: any) {
    switch (action) {
      case 'depth':
        return getDepth(payload)
      case 'parent':
        return payload.parent
    }
  }

  findParent() {}

  init(element: Element) {
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
    const { evt: userEvent, data, view: userView } = options
    this.data = formatData(data)
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
    const { colorDecorator, ...view } = { ...defaultViewOptions, ...userView }
    // assign color mappings
    this.colorsMappings = handleColorMappings.call(this.API, this.data, colorDecorator)
    this.viewConfig = view
    console.log(this.colorsMappings)
    this.resize()
  }
}

export function createTreemap() {
  return new Paint()
}
