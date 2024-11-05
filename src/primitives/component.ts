import type { ColorDecoratorResult } from '../etoile/native/runtime'
import { Box, Rect, Text, etoile } from '../etoile'
import type { EventMethods } from './event'
import { bindParentForModule } from './struct'
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
}

const defaultRegistries = [
  registerModuleForSchedule(new SelfEvent())
]

export function charCodeWidth(c: CanvasRenderingContext2D, ch: number) {
  return c.measureText(String.fromCharCode(ch)).width
}

export function evaluateOptimalFontSize(
  c: CanvasRenderingContext2D,
  text: string,
  width: number,
  fontRange: Series<number>,
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

export function getSafeText(c: CanvasRenderingContext2D, text: string, width: number) {
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

function createFillBlock(color: ColorDecoratorResult, x: number, y: number, width: number, height: number) {
  return new Rect({ width, height, x, y, style: { fill: color, opacity: 1 } })
}

function createTitleText(text: string, x: number, y: number, font: string, color: string) {
  return new Text({
    text,
    x,
    y,
    style: { fill: color, textAlign: 'center', baseline: 'middle', font, lineWidth: 1 }
  })
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
  private bgBox: Box
  private fgBox: Box
  constructor(...args: ConstructorParameters<typeof Schedule>) {
    super(...args)
    this.data = []
    this.layoutNodes = []
    this.bgBox = new Box()
    this.fgBox = new Box()
    this.decorator = Object.create(null)
  }

  drawBackgroundNode(node: LayoutModule) {
    for (const child of node.children) {
      this.drawBackgroundNode(child)
    }
    const [x, y, w, h] = node.layout
    const { rectGap, titleHeight } = node.decorator
    const fill = this.decorator.color.mappings[node.node.id]
    if (node.children.length) {
      const box = new Box()
      box.add(
        createFillBlock(fill, x, y, w, titleHeight),
        createFillBlock(fill, x, y + h - rectGap, w, rectGap),
        createFillBlock(fill, x, y + titleHeight, rectGap, h - titleHeight - rectGap),
        createFillBlock(fill, x + w - rectGap, y + titleHeight, rectGap, h - titleHeight - rectGap)
      )
      this.bgBox.add(box)
    } else {
      this.bgBox.add(createFillBlock(fill, x, y, w, h))
    }
  }

  drawForegroundNode(node: LayoutModule) {
    for (const child of node.children) {
      this.drawForegroundNode(child)
    }
    const [x, y, w, h] = node.layout
    const { rectBorderWidth, titleHeight, rectGap } = node.decorator
    const { fontSize, fontFamily, color } = this.decorator.font
    const rect = new Rect({
      x: x + 0.5,
      y: y + 0.5,
      width: w,
      height: h,
      style: { stroke: '#222', lineWidth: rectBorderWidth }
    })
    this.fgBox.add(rect)
    this.render.ctx.textBaseline = 'middle'
    const optimalFontSize = evaluateOptimalFontSize(
      this.render.ctx,
      node.node.label,
      w - (rectGap * 2),
      fontSize,
      fontFamily,
      node.children.length ? Math.round(titleHeight / 2) + rectGap : h
    )
    this.render.ctx.font = `${optimalFontSize}px ${fontFamily}`
    if (h > titleHeight) {
      const result = getSafeText(this.render.ctx, node.node.label, w - (rectGap * 2))
      if (!result) return
      const { text, width } = result
      const textX = x + Math.round((w - width) / 2)
      let textY = y + Math.round(h / 2)
      if (node.children.length) {
        textY = y + Math.round(titleHeight / 2)
      }
      this.fgBox.add(createTitleText(text, textX, textY, `${optimalFontSize}px ${fontFamily}`, color))
    } else {
      const ellipsisWidth = 3 * charCodeWidth(this.render.ctx, 46)
      const textX = x + Math.round((w - ellipsisWidth) / 2)
      const textY = y + Math.round(h / 2)
      this.fgBox.add(createTitleText('...', textX, textY, `${optimalFontSize}px ${fontFamily}`, color))
    }
  }

  reset() {
    this.bgBox.destory()
    this.fgBox.destory()
    this.remove(this.bgBox, this.fgBox)
    for (const node of this.layoutNodes) {
      this.drawBackgroundNode(node)
      this.drawForegroundNode(node)
    }
    this.add(this.bgBox, this.fgBox)
  }

  get api() {
    return {
      zoom: (node: LayoutModule) => {
        this.event.emit('zoom', node)
      }
    }
  }
}

export function createTreemap() {
  let treemap: TreemapLayout | null = null
  let root: Element | null = null
  const uses: any[] = []

  const context = {
    init,
    dispose,
    setOptions,
    resize,
    use
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
    treemap.render.initOptions({ height, width, devicePixelRatio: window.devicePixelRatio })
    resetLayout(treemap, width, height)
    treemap.update()
  }

  function setOptions(options: TreemapOptions) {
    if (!treemap) {
      throw new Error('Treemap not initialized')
    }
    treemap.data = bindParentForModule(options.data || [])
    for (const registry of defaultRegistries) {
      registry(context, treemap, treemap.render)
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

  return context as App & EventMethods
}

export type TreemapInstanceAPI = TreemapLayout['api']
