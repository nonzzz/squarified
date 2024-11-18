import { createFillBlock, createTitleText } from '../shared'
import { Box, Layer, etoile } from '../etoile'
import type { EventMethods } from './event'
import { bindParentForModule, findRelativeNodeById } from './struct'
import type { Module, NativeModule } from './struct'
import { squarify } from './squarify'
import type { LayoutModule } from './squarify'
import { SelfEvent } from './event'
import { registerModuleForSchedule } from './registry'
import type { RenderDecorator, Series } from './decorator'

export interface TreemapOptions {
  data: Module[]
}

export type Using = 'decorator'

export interface App {
  init: (el: Element) => void
  dispose: () => void
  setOptions: (options: TreemapOptions) => void
  resize: () => void
  // eslint-disable-next-line no-use-before-define
  use: (using: Using, register: (app: TreemapLayout) => void) => void
  zoom: (id: string) => void
}

const defaultRegistries = [
  registerModuleForSchedule(new SelfEvent())
]

function measureTextWidth(c: CanvasRenderingContext2D, text: string) {
  return c.measureText(text).width
}

interface OptimalFontOptions {
  range: Series<number>
  family: string
}

export function evaluateOptimalFontSize(
  c: CanvasRenderingContext2D,
  text: string,
  font: OptimalFontOptions,
  desiredW: number,
  desiredH: number
) {
  desiredW = Math.floor(desiredW)
  desiredH = Math.floor(desiredH)
  const { range, family } = font
  let min = range.min
  let max = range.max
  const cache = new Map<number, { width: number; height: number }>()

  while (max - min >= 1) {
    const current = min + (max - min) / 2
    if (!cache.has(current)) {
      c.font = `${current}px ${family}`
      const metrics = c.measureText(text)
      const width = metrics.width
      const height = metrics.actualBoundingBoxAscent + metrics.actualBoundingBoxDescent
      cache.set(current, { width, height })
    }

    const { width, height } = cache.get(current)!

    if (width > desiredW || height > desiredH) {
      max = current
    } else {
      min = current
    }
  }

  return Math.floor(min)
}

export function getSafeText(c: CanvasRenderingContext2D, text: string, width: number, cache: Record<string, number>) {
  let ellipsisWidth = 0
  if (text in cache) {
    ellipsisWidth = cache[text]
  } else {
    ellipsisWidth = measureTextWidth(c, '...')
    cache[text] = ellipsisWidth
  }
  if (width < ellipsisWidth) {
    return false
  }
  const textWidth = measureTextWidth(c, text)
  if (textWidth < width) {
    return { text, width: textWidth }
  }
  return { text: '...', width: ellipsisWidth }
}

export function resetLayout(treemap: TreemapLayout, w: number, h: number) {
  treemap.layoutNodes = squarify(treemap.data, { w, h, x: 0, y: 0 }, treemap.decorator.layout)
  treemap.reset()
}

// https://www.typescriptlang.org/docs/handbook/mixins.html
class Schedule extends etoile.Schedule {}

export class TreemapLayout extends Schedule {
  data: NativeModule[]
  layoutNodes: LayoutModule[]
  decorator: RenderDecorator
  private bgLayer: Layer
  private fgBox: Box
  fontsCaches: Record<string, number>
  ellispsisWidthCache: Record<string, number>
  constructor(...args: ConstructorParameters<typeof Schedule>) {
    super(...args)
    this.data = []
    this.layoutNodes = []
    this.bgLayer = new Layer()
    this.fgBox = new Box()
    this.decorator = Object.create(null)
    this.fontsCaches = Object.create(null)
    this.ellispsisWidthCache = Object.create(null)
    this.bgLayer.setCanvasOptions(this.render.options)
  }

  drawBackgroundNode(node: LayoutModule) {
    const [x, y, w, h] = node.layout
    const fill = this.decorator.color.mappings[node.node.id]
    const s = createFillBlock(x, y, w, h, { fill })
    this.bgLayer.add(s)
    for (const child of node.children) {
      this.drawBackgroundNode(child)
    }
  }

  drawForegroundNode(node: LayoutModule) {
    const [x, y, w, h] = node.layout
    if (!w || !h) return
    const { rectBorderWidth, titleHeight, rectGap } = node.decorator
    const { fontSize, fontFamily, color } = this.decorator.font
    this.fgBox.add(createFillBlock(x + 0.5, y + 0.5, w, h, { stroke: '#222', lineWidth: rectBorderWidth }))
    let optimalFontSize
    if (node.node.id in this.fontsCaches) {
      optimalFontSize = this.fontsCaches[node.node.id]
    } else {
      optimalFontSize = evaluateOptimalFontSize(
        this.render.ctx,
        node.node.id,
        {
          range: fontSize,
          family: fontFamily
        },
        w - (rectGap * 2),
        node.children.length ? Math.round(titleHeight / 2) + rectGap : h
      )
      this.fontsCaches[node.node.id] = optimalFontSize
    }

    this.render.ctx.font = `${optimalFontSize}px ${fontFamily}`
    const result = getSafeText(this.render.ctx, node.node.id, w - (rectGap * 2), this.ellispsisWidthCache)
    if (!result) return
    if (result.width >= w || optimalFontSize >= h) return
    const { text, width } = result
    const textX = x + Math.round((w - width) / 2)
    const textY = y + (node.children.length ? Math.round(titleHeight / 2) : Math.round(h / 2))
    this.fgBox.add(createTitleText(text, textX, textY, `${optimalFontSize}px ${fontFamily}`, color))
    for (const child of node.children) {
      this.drawForegroundNode(child)
    }
  }

  reset() {
    this.fgBox.destory()
    this.remove(this.bgLayer, this.fgBox)
    this.render.ctx.textBaseline = 'middle'
    if (!this.bgLayer.__refresh__) {
      this.bgLayer.destory()
      for (const node of this.layoutNodes) {
        this.drawBackgroundNode(node)
      }
    }
    for (const node of this.layoutNodes) {
      this.drawForegroundNode(node)
    }
    this.add(this.bgLayer, this.fgBox)
  }

  get api() {
    return {
      zoom: (node: LayoutModule) => {
        this.event.emit('zoom', node)
      }
    }
  }

  get backgroundLayer() {
    return this.bgLayer
  }
}

export function createTreemap() {
  let treemap: TreemapLayout | null = null
  let root: Element | null = null
  let installed = false
  const uses: any[] = []

  const context = {
    init,
    dispose,
    setOptions,
    resize,
    use,
    zoom
  }

  function init(el: Element) {
    treemap = new TreemapLayout(el)
    root = el
  }
  function dispose() {
    if (root && treemap) {
      treemap.destory()
      root.removeChild(root.firstChild!)
      root = null
      treemap = null
    }
  }

  function resize() {
    if (!treemap || !root) return
    const { width, height } = root.getBoundingClientRect()
    treemap.backgroundLayer.__refresh__ = false
    treemap.render.initOptions({ height, width, devicePixelRatio: window.devicePixelRatio })
    treemap.backgroundLayer.setCanvasOptions(treemap.render.options)
    treemap.backgroundLayer.initLoc()
    treemap.backgroundLayer.matrix = treemap.backgroundLayer.matrix.create({ a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 })
    treemap.fontsCaches = Object.create(null)
    treemap.event.emit('cleanup:selfevent')
    resetLayout(treemap, width, height)
    treemap.update()
  }

  function setOptions(options: TreemapOptions) {
    if (!treemap) {
      throw new Error('Treemap not initialized')
    }
    treemap.data = bindParentForModule(options.data || [])

    if (!installed) {
      for (const registry of defaultRegistries) {
        registry(context, treemap, treemap.render)
      }
      installed = true
    }

    for (const use of uses) {
      use(treemap)
    }
    resize()
  }

  function use(key: Using, register: (decorator: TreemapLayout) => void) {
    switch (key) {
      case 'decorator':
        uses.push((treemap: TreemapLayout) => register(treemap))
        break
    }
  }

  function zoom(id: string) {
    if (!treemap) {
      throw new Error("treemap don't init.")
    }
    const node = findRelativeNodeById(id, treemap.layoutNodes)
    node && treemap.api.zoom(node)
  }

  return context as App & EventMethods
}

export type TreemapInstanceAPI = TreemapLayout['api']
