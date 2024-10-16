import type {
  GetAction,
  GroupBarHeight,
  GroupDecorator,
  PaintEventMap,
  PaintRect,
  PaintView,
  Treemap,
  TreemapContext,
  TreemapOptions
} from './interface'
import { type Module, type SquarifiedModule, type SquarifiedModuleWithLayout, squarify } from './primitives'
import { Iter } from './shared'
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

export function charCodeWidth(c: CanvasRenderingContext2D, ch: number) {
  return c.measureText(String.fromCharCode(ch)).width
}

export function textOverflowEllipsis(c: CanvasRenderingContext2D, text: string, width: number, ellipsisWidth: number): [string, number] {
  if (width < ellipsisWidth) {
    return ['', 0]
  }
  let textWidth = 0
  let i = 0
  while (i < text.length) {
    const charWidth = charCodeWidth(c, text.charCodeAt(i))
    if (width < textWidth + charWidth + ellipsisWidth) {
      return [text.slice(0, i) + '...', textWidth + ellipsisWidth]
    }
    textWidth += charWidth
    i++
  }
  return [text, textWidth]
}

function formatData(nodes: Module[], parent?: Module) {
  return nodes.map(node => {
    const next = { ...node }
    next.parent = parent
    if (node.groups && Array.isArray(node.groups)) {
      next.groups = formatData(node.groups, next)
    }
    return next
  }) as SquarifiedModule[]
}

function getDepth(node: SquarifiedModule) {
  let depth = 0
  while (node.parent) {
    node = node.parent
    depth++
  }
  return depth
}

const defaultGroupBarHeight = {
  max: 80,
  min: 20
} satisfies GroupBarHeight

const defaultGroupDecorator = {
  gap: 5,
  borderWidth: 1.5,
  borderRadius: 0.5,
  barHeight: defaultGroupBarHeight
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
  private colorMappings: Record<string, string>
  private viewConfig: Omit<PaintView, 'colorDecorator'> | null
  private arena: Record<string, any>
  constructor() {
    this.mountedNode = null
    this._canvas = null
    this._context = null
    this.rect = { w: 0, h: 0 }
    this.data = []
    this.layoutNodes = []
    this.eventCollections = []
    this.colorMappings = {}
    this.arena = {}
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
    this.arena = {}
    this.colorMappings = {}
    this.rect = { w: 0, h: 0 }
  }

  private drawNodeBackground(node: SquarifiedModuleWithLayout) {
    const [x, y, w, h] = node.layout
    const { gap, barHeight, borderRadius, borderWidth } = this.groupDecorator(node.node)
    const adjustedX = x
    const adjustedY = y

    for (const child of node.children) {
      this.drawNodeBackground(child)
    }
    this.ctx.lineWidth = borderWidth
    this.ctx.fillStyle = this.colorMappings[node.node.id]
    this.ctx.strokeStyle = '#222'
    if (node.children.length) {
      // Draw top bar with border radius
      this.drawRoundedRect(adjustedX, y, w, barHeight, borderRadius)
      // Draw bottom bar with border radius
      this.drawRoundedRect(adjustedX, y + h - gap, w, gap, borderRadius)
      // Draw left bar with border radius
      this.drawRoundedRect(adjustedX, y + barHeight, gap, h - barHeight - gap, borderRadius)
      // Draw right bar with border radius
      this.drawRoundedRect(adjustedX + w - gap, y + barHeight, gap, h - barHeight - gap, borderRadius)
    } else {
      this.drawRoundedRect(adjustedX, adjustedY, w, h, borderRadius)
    }
  }

  private drawRoundedRect(x: number, y: number, w: number, h: number, r: number) {
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
    // if (this.ctx.lineWidth > 0) {
    //   this.ctx.stroke()
    // }
  }

  private drawNodeForeground(node: SquarifiedModuleWithLayout) {
    const [x, y, w, h] = node.layout
    this.ctx.strokeStyle = '#222'
    const groupDecorator = this.groupDecorator(node.node)
    this.ctx.lineWidth = groupDecorator.borderWidth
    const { gap, barHeight } = groupDecorator
    this.ctx.strokeRect(x + 0.5, y + 0.5, w, h)

    if (h > barHeight) {
      this.ctx.fillStyle = '#000'
      const maxWidth = w - (gap * 2)
      const textY = y + Math.round((gap + barHeight) / 2) + 1
      const ellipsisWidth = 3 * charCodeWidth(this.ctx, 46)
      const [text, width] = textOverflowEllipsis(this.ctx, node.node.label, maxWidth, ellipsisWidth)
      const textX = x + Math.round((w - width) / 2)
      if (text) {
        this.ctx.font = '12px sans-serif'
        this.ctx.globalAlpha = 0.5
        if (node.children.length) {
          this.ctx.fillText(text, textX, textY)
        } else {
          const textY = y + Math.round(h / 2)
          this.ctx.fillText(text, textX, textY)
        }
        this.ctx.globalAlpha = 1
      }

      for (const child of node.children) {
        this.drawNodeForeground(child)
      }
    }
  }

  private draw() {
    this.ctx.clearRect(0, 0, this.rect.w, this.rect.h)
    for (const node of this.layoutNodes) {
      this.drawNodeBackground(node)
    }
    for (const node of this.layoutNodes) {
      this.drawNodeForeground(node)
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

  groupDecorator(node: SquarifiedModule) {
    if (!this.viewConfig) throw new Error('GroupDecorator not initialized')
    const depth = this.get('depth', node) || 1
    const { barHeight, ...rest } = this.viewConfig.groupDecorator
    const { max, min } = barHeight
    const diff = max / depth
    return {
      ...rest,
      barHeight: diff < min ? min : diff
    }
  }

  private get API() {
    return {
      zoom: this.zoom,
      get: this.get,
      state: {
        get: (key) => this.arena[key],
        set: (key, value) => {
          this.arena[key] = value
        }
      }
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
      this.layoutNodes = squarify(this.data, this.rect, this.groupDecorator.bind(this))
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
    this.colorMappings = handleColorMappings.call(this.API, this.data, colorDecorator)
    this.viewConfig = view
    this.resize()
  }
}

export function createTreemap() {
  return new Paint()
}
