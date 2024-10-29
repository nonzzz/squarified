import { Box, Event, Rect, Text, etoile } from '../etoile'
import type { PrimitiveEventDefinition } from './event'
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

type ExtendRegistry = Omit<Event<PrimitiveEventDefinition>, 'bindWithContext'>

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

export class TreemapLayout extends etoile.Schedule {
  data: NativeModule[]
  layoutNodes: LayoutModule[]
  decorator: RenderDecorator
  private bgBox: Box
  private fgBox: Box
  constructor(...args: ConstructorParameters<typeof etoile.Schedule>) {
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
      const top = new Rect({
        x,
        y,
        width: w,
        height: titleHeight,
        style: { fill }
      })
      const bottom = new Rect({
        x,
        y: y + h - rectGap,
        width: w,
        height: rectGap,
        style: { fill }
      })
      const left = new Rect({
        x,
        y: y + titleHeight,
        width: rectGap,
        height: h - titleHeight - rectGap,
        style: { fill }
      })

      const right = new Rect({
        x: x + w - rectGap,
        y: y + titleHeight,
        width: rectGap,
        height: h - titleHeight - rectGap,
        style: { fill }
      })

      this.bgBox.add(top)
      this.bgBox.add(bottom)
      this.bgBox.add(left)
      this.bgBox.add(right)
    } else {
      const rect = new Rect({
        width: w,
        height: h,
        x,
        y,
        style: { fill }
      })
      this.bgBox.add(rect)
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
    if (h > titleHeight) {
      const result = getSafeText(this.render.ctx, node.node.label, w - (rectGap * 2))
      if (!result) return
      const { text, width } = result
      const textX = x + Math.round((w - width) / 2)
      let textY = y + Math.round(h / 2)
      if (node.children.length) {
        textY = y + Math.round(titleHeight / 2)
      }
      const f = new Text({
        x: textX,
        y: textY,
        text,
        style: {
          fill: color,
          textAlign: 'center',
          baseline: 'middle',
          font: `${optimalFontSize}px ${fontFamily}`,
          lineWidth: 1
        }
      })
      this.fgBox.add(f)
    } else {
      const ellipsisWidth = 3 * charCodeWidth(this.render.ctx, 46)
      const textX = x + Math.round((w - ellipsisWidth) / 2)
      const textY = y + Math.round(h / 2)
      this.fgBox.add(
        new Text({
          text: '...',
          x: textX,
          y: textY,
          style: {
            fill: color,
            textAlign: 'center',
            baseline: 'middle',
            font: `${optimalFontSize}px ${fontFamily}`,
            lineWidth: 1
          }
        })
      )
    }
  }

  draw() {
    this.bgBox.elements = []
    this.fgBox.elements = []
    this.remove(this.bgBox, this.fgBox)
    for (const node of this.layoutNodes) {
      this.drawBackgroundNode(node)
      this.drawForegroundNode(node)
    }
    this.add(this.bgBox, this.fgBox)
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
      root.removeChild(root.firstChild!)
      root = null
      treemap = null
    }
  }

  function resize() {
    if (!treemap || !root) return
    const { width, height } = root.getBoundingClientRect()
    treemap.render.initOptions({ height, width, devicePixelRatio: window.devicePixelRatio })
    treemap.layoutNodes = squarify(treemap.data, { w: width, h: height, x: 0, y: 0 }, treemap.decorator.layout)
    treemap.draw()
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

  return context as App & ExtendRegistry
}
