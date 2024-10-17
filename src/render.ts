import type {
  GetAction,
  GroupDecorator,
  PaintRect,
  PaintView,
  Range,
  TextDecorator,
  Treemap,
  TreemapContext,
  TreemapOptions
} from './interface'
import type { Module, SquarifiedModule, SquarifiedModuleWithLayout } from './primitives'
import { squarify } from './primitives'
import { Iter, noop, replaceString } from './shared'
import { defaultColorDecorator, handleColorMappings } from './colors'
import { primitiveEvents } from './events'
import type { EventType, PrimitiveHandler } from './events'

interface EventCollection {
  name: string
  handler: EventListener
}

function createPaintEventHandler(canvas: HTMLCanvasElement, eventType: EventType, handler: EventListener) {
  canvas.addEventListener(eventType, handler)
  return { handler }
}

export function charCodeWidth(c: CanvasRenderingContext2D, ch: number) {
  return c.measureText(String.fromCharCode(ch)).width
}

function evaluateOptimalFontSize(
  c: CanvasRenderingContext2D,
  text: string,
  width: number,
  fontRange: Range<number>,
  fontFamily: string,
  height: number
) {
  height = Math.floor(height)
  let optimalFontSize = fontRange.min
  for (let fontSize = fontRange.min; fontSize <= fontRange.max; fontSize++) {
    c.font = `${fontSize}px ${fontFamily}`
    let textWidth = 0
    const textHeight = fontSize
    let i = 0
    while (i < text.length) {
      const codePointWidth = charCodeWidth(c, text.charCodeAt(i))
      textWidth += codePointWidth
      i++
    }
    if (textWidth >= width) {
      const overflow = textWidth - width
      const ratio = overflow / textWidth
      const newFontSize = Math.abs(Math.floor(fontSize - fontSize * ratio))
      optimalFontSize = newFontSize || fontRange.min
      break
    }
    if (textHeight >= height) {
      const overflow = textHeight - height
      const ratio = overflow / textHeight
      const newFontSize = Math.abs(Math.floor(fontSize - fontSize * ratio))
      optimalFontSize = newFontSize || fontRange.min
      break
    }
    optimalFontSize = fontSize
  }
  return optimalFontSize
}

function getSafeText(c: CanvasRenderingContext2D, text: string, width: number) {
  const ellipsisWidth = c.measureText('...').width
  if (width < ellipsisWidth) {
    return false
  }
  let textWidth = 0
  let i = 0
  while (i < text.length) {
    const codePointWidth = charCodeWidth(c, text.charCodeAt(i))
    textWidth += codePointWidth
    i++
  }
  if (textWidth < width) {
    return { text, width: textWidth }
  }
  return { text: '...', width: ellipsisWidth }
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

const defaultGroupBarHeight: Range<number> = {
  max: 80,
  min: 20
}

const defaultGroupDecorator = {
  gap: 5,
  borderWidth: 1.5,
  borderRadius: 0.5,
  barHeight: defaultGroupBarHeight
} satisfies GroupDecorator

const defaultFontSizes: Range<number> = {
  max: 38,
  min: 7
}

const defaultTextDecorator = {
  color: '#000',
  fontSize: defaultFontSizes,
  fontFamily: 'sans-serif'
} satisfies TextDecorator

const defaultViewOptions = {
  colorDecorator: defaultColorDecorator,
  groupDecorator: defaultGroupDecorator,
  textDecorator: defaultTextDecorator
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

  private bindEvent(evt: Event, primitiveHandler: PrimitiveHandler, userHandler: any) {
    // primitiveHandler.call(this.API, evt)
    // userHandler.call(this.API, {
    //   nativeEvent: evt as any,
    //   module: {}
    // })
    // primitiveHandler()
    primitiveHandler.call(this.API, evt as any)
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
  }

  private drawNodeForeground(node: SquarifiedModuleWithLayout) {
    const [x, y, w, h] = node.layout
    this.ctx.strokeStyle = '#222'
    const groupDecorator = this.groupDecorator(node.node)
    const { fontSize, fontFamily, color } = this.textDecorator
    this.ctx.lineWidth = groupDecorator.borderWidth
    const { gap, barHeight } = groupDecorator
    this.ctx.strokeRect(x + 0.5, y + 0.5, w, h)
    this.ctx.fillStyle = color
    this.ctx.textBaseline = 'middle'
    const optimalFontSize = evaluateOptimalFontSize(
      this.ctx,
      node.node.label,
      w - (gap * 2),
      fontSize,
      fontFamily,
      node.children.length ? Math.round(barHeight / 2) + gap : h
    )
    this.ctx.font = `${optimalFontSize}px ${fontFamily}`
    if (h > barHeight) {
      const result = getSafeText(this.ctx, node.node.label, w - (gap * 2))
      if (!result) return
      const { text, width } = result
      const textX = x + Math.round((w - width) / 2)
      if (node.children.length) {
        const textY = y + Math.round(barHeight / 2)
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
    for (const child of node.children) {
      this.drawNodeForeground(child)
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

  private groupDecorator(node: SquarifiedModule) {
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

  private get textDecorator() {
    if (!this.viewConfig) throw new Error('TextDecorator not initialized')
    return this.viewConfig.textDecorator
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
      console.log(this.layoutNodes)
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
    for (const { key, value } of new Iter(primitiveEvents)) {
      const nativeEventname = replaceString(key, 'on', '')
      const { handler } = createPaintEventHandler(this.canvas, nativeEventname, (e) => {
        const userHandler = userEvent?.[nativeEventname] || noop
        this.bindEvent(e, value, userHandler)
      })

      this.eventCollections.push({ name: key, handler })
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
