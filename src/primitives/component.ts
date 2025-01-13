/* eslint-disable no-use-before-define */
import { Bitmap, Box, Canvas, Schedule } from '../etoile'
import type { Render, RenderViewportOptions } from '../etoile'
import type { DOMEventDefinition } from '../etoile/native/dom'
import { log } from '../etoile/native/log'
import { Matrix2D } from '../etoile/native/matrix'
import { createRoundBlock, createTitleText } from '../shared'
import type { RenderDecorator, Series } from './decorator'
import type { ExposedEventMethods, InternalEventDefinition } from './event'
import { INTERNAL_EVENT_MAPPINGS, TreemapEvent } from './event'
import { register } from './registry'
import { squarify } from './squarify'
import type { LayoutModule } from './squarify'
import { bindParentForModule, findRelativeNodeById } from './struct'
import type { Module, NativeModule } from './struct'

export interface TreemapOptions {
  data: Module[]
}

export type UseKind = 'decorator'

export interface App {
  init: (el: HTMLElement) => void
  dispose: () => void
  setOptions: (options: TreemapOptions) => void
  resize: () => void

  use: (using: UseKind, register: (app: TreemapLayout) => void) => void
  zoom: (id: string) => void
}

function measureTextWidth(c: CanvasRenderingContext2D, text: string) {
  return c.measureText(text).width
}

interface OptimalFontOptions {
  range: Series<number>
  family: string
}

/**
 * This interface isn't stable it might be remove at next few versions.
 * If you want set custom decorator pls see 'presetDecorator' for details.
 */

export type unstable_use = (app: TreemapLayout) => void

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
  const cache = new Map<number, { width: number, height: number }>()

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
  treemap.reset(true)
}

export class Highlight extends Schedule<DOMEventDefinition> {
  reset() {
    this.destory()
    this.update()
  }

  get canvas() {
    return this.render.canvas
  }

  setZIndexForHighlight(zIndex = '-1') {
    this.canvas.style.zIndex = zIndex
  }

  init() {
    this.setZIndexForHighlight()
    this.canvas.style.position = 'absolute'
    this.canvas.style.pointerEvents = 'none'
  }
}

export class TreemapLayout extends Schedule<InternalEventDefinition> {
  data: NativeModule[]
  layoutNodes: LayoutModule[]
  decorator: RenderDecorator
  bgBox: Box
  fgBox: Box
  fontsCaches: Record<string, number>
  ellispsisWidthCache: Record<string, number>
  highlight: Highlight
  renderCache: RenderCache
  constructor(...args: ConstructorParameters<typeof Schedule>) {
    super(...args)
    this.data = []
    this.layoutNodes = []
    this.bgBox = new Box()
    this.fgBox = new Box()
    this.decorator = Object.create(null) as RenderDecorator
    this.fontsCaches = Object.create(null) as Record<string, number>
    this.ellispsisWidthCache = Object.create(null) as Record<string, number>
    this.highlight = new Highlight(this.to, { width: this.render.options.width, height: this.render.options.height })
    this.renderCache = new RenderCache(this.render.options)
  }

  drawBackgroundNode(node: LayoutModule) {
    const [x, y, w, h] = node.layout
    const padding = 2
    if (w - padding * 2 <= 0 || h - padding * 2 <= 0) {
      return
    }
    const fill = this.decorator.color.mappings[node.node.id]
    this.bgBox.add(createRoundBlock(x, y, w, h, { fill, padding, radius: 2 }))
    for (const child of node.children) {
      this.drawBackgroundNode(child)
    }
  }

  drawForegroundNode(node: LayoutModule) {
    const [x, y, w, h] = node.layout
    if (!w || !h) { return }
    const { titleHeight, rectGap } = node.decorator
    const { fontSize, fontFamily, color } = this.decorator.font
    let optimalFontSize
    if (node.node.id in this.fontsCaches) {
      optimalFontSize = this.fontsCaches[node.node.id]
    } else {
      optimalFontSize = evaluateOptimalFontSize(
        this.render.ctx,
        // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
        node.node.label,
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
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    const result = getSafeText(this.render.ctx, node.node.label, w - (rectGap * 2), this.ellispsisWidthCache)
    if (!result) { return }
    if (result.width >= w || optimalFontSize >= h) { return }
    const { text, width } = result
    const textX = x + Math.round((w - width) / 2)
    const textY = y + (node.children.length ? Math.round(titleHeight / 2) : Math.round(h / 2))
    this.fgBox.add(createTitleText(text, textX, textY, `${optimalFontSize}px ${fontFamily}`, color))
    for (const child of node.children) {
      this.drawForegroundNode(child)
    }
  }

  reset(refresh = false) {
    this.remove(this.bgBox, this.fgBox)
    this.bgBox.destory()

    if (this.renderCache.state) {
      this.fgBox.destory()
      this.bgBox.add(new Bitmap({ bitmap: this.renderCache.canvas }))
    } else {
      for (const node of this.layoutNodes) {
        this.drawBackgroundNode(node)
      }
      if (!this.fgBox.elements.length || refresh) {
        this.render.ctx.textBaseline = 'middle'
        this.fgBox.destory()
        for (const node of this.layoutNodes) {
          this.drawForegroundNode(node)
        }
      } else {
        this.fgBox = this.fgBox.clone()
      }
    }

    this.add(this.bgBox, this.fgBox)
  }

  get api() {
    return {
      zoom: (node: LayoutModule | null) => {
        if (!node) { return }
        this.event.emit(INTERNAL_EVENT_MAPPINGS.ON_ZOOM, node)
      }
    }
  }
}

export function createTreemap() {
  let treemap: TreemapLayout | null = null
  let root: HTMLElement | null = null
  let installed = false
  const uses: unstable_use[] = []

  const context = {
    init,
    dispose,
    setOptions,
    resize,
    use,
    zoom
  }

  function init(el: HTMLElement) {
    treemap = new TreemapLayout(el)
    root = el
    ;(root as HTMLDivElement).style.position = 'relative'

    if (!installed) {
      register(TreemapEvent)(context, treemap)

      installed = true
    }
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
    if (!treemap || !root) { return }
    const { width, height } = root.getBoundingClientRect()
    treemap.render.initOptions({ height, width, devicePixelRatio: window.devicePixelRatio })
    treemap.render.canvas.style.position = 'absolute'
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    treemap.fontsCaches = Object.create(null)
    treemap.event.emit(INTERNAL_EVENT_MAPPINGS.ON_CLEANUP)
    treemap.highlight.render.initOptions({ height, width, devicePixelRatio: window.devicePixelRatio })
    treemap.highlight.reset()
    treemap.highlight.init()
    resetLayout(treemap, width, height)
    treemap.update()
  }

  function setOptions(options: TreemapOptions) {
    if (!treemap) {
      throw new Error(log.error('Treemap not initialized'))
    }
    treemap.data = bindParentForModule(options.data || [])

    for (const use of uses) {
      use(treemap)
    }
    resize()
  }

  function use(key: UseKind, register: (decorator: TreemapLayout) => void) {
    switch (key) {
      case 'decorator':
        uses.push((treemap: TreemapLayout) => register(treemap))
        break
    }
  }

  function zoom(id: string) {
    if (!treemap) {
      throw new Error(log.error("treemap don't init."))
    }
    const node = findRelativeNodeById(id, treemap.layoutNodes)
    if (node) {
      treemap.api.zoom(node)
    }
  }

  return context as App & ExposedEventMethods
}

export type TreemapInstanceAPI = TreemapLayout['api']

// The following is my opinionated.
// For better performance, we desgin a cache system to store the render result.
// two step
// 1. draw current canvas into a cache canvas (offscreen canvas)
// 2. draw cache canvas into current canvas (note we should respect the dpi)
export class RenderCache extends Canvas {
  key: string
  private $memory: boolean
  constructor(opts: RenderViewportOptions) {
    super(opts)
    this.key = 'render-cache'
    this.$memory = false
  }
  get state() {
    return this.$memory
  }
  flush(render: Render, matrix: Matrix2D) {
    // this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height)
    const { devicePixelRatio, width, height } = render.options
    const w = width / devicePixelRatio
    const h = height / devicePixelRatio
    // applyCanvasTransform(this.ctx, matrix, devicePixelRatio)
    this.ctx.drawImage(render.canvas, 0, 0, w, h)
    this.$memory = true
  }
  destroy() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height)
    this.$memory = false
  }
}
