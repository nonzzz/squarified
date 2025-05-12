/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable no-use-before-define */
import { Box, Schedule } from './etoile'
import type { ColorDecoratorResult } from './etoile/native/runtime'
import type { GraphicConfig, GraphicFont, GraphicLayout, Series } from './interface'
import type { LayoutModule } from './primitives/squarify'
import { squarify } from './primitives/squarify'
import type { NativeModule } from './primitives/struct'
import { createRoundBlock, createTitleText } from './shared'
import { createLogger } from './shared/logger'
import { PluginDriver } from './shared/plugin-driver'

export const logger = createLogger('Treemap')

export type ColorMappings = Record<string, ColorDecoratorResult>

const DEFAULT_RECT_FILL_DESC: ColorDecoratorResult = {
  mode: 'rgb',
  desc: { r: 0, g: 0, b: 0 }
}

const DEFAULT_TITLE_AREA_HEIGHT: Series<number> = {
  min: 30,
  max: 60
}

const DEFAULT_RECT_GAP = 4

const DEFAULT_RECT_BORDER_RADIUS = 4

const DEFAULT_FONT_SIZE: Series<number> = {
  max: 70,
  min: 12
}

const DEFAULT_FONT_FAMILY = 'sans-serif'

const DEFAULT_FONT_COLOR = '#000'

export class Component extends Schedule {
  pluginDriver: PluginDriver<Component>
  data: NativeModule[]
  colorMappings: ColorMappings
  rectLayer: Box
  textLayer: Box
  layoutNodes: LayoutModule[]
  config: GraphicConfig
  constructor(config: GraphicConfig, ...args: ConstructorParameters<typeof Schedule>) {
    super(...args)
    this.data = []
    this.config = config
    this.colorMappings = {}
    this.pluginDriver = new PluginDriver(this)
    this.rectLayer = new Box()
    this.textLayer = new Box()
    this.layoutNodes = []
  }
  private drawBroundRect(node: LayoutModule) {
    const [x, y, w, h] = node.layout
    const { rectRadius } = node.config
    const isCombinedNode = !!node.node.isCombinedNode
    const originalNodeCount = node.node.originalNodeCount || 0

    const effectiveRadius = Math.min(
      rectRadius,
      w / 4,
      h / 4
    )
    const fill = this.colorMappings[node.node.id] || DEFAULT_RECT_FILL_DESC
    const rect = createRoundBlock(x, y, w, h, {
      fill,
      padding: 0,
      radius: effectiveRadius
    })

    rect.__widget__ = node

    if (isCombinedNode && originalNodeCount > 0) {
      //  TODO add tag for combined node
    }
    this.rectLayer.add(rect)
    for (const child of node.children) {
      this.drawBroundRect(child)
    }
  }
  private drawText(node: LayoutModule) {
    if (!node.node.label) { return }

    const [x, y, w, h] = node.layout
    const { titleAreaHeight } = node.config
    const content: string = node.node.label
    const availableHeight = node.children && node.children.length > 0
      ? titleAreaHeight - DEFAULT_RECT_GAP * 2
      : h - DEFAULT_RECT_GAP * 2
    const availableWidth = w - DEFAULT_RECT_GAP * 2
    if (availableWidth <= 0 || availableHeight <= 0) { return }
    const optimalFontSize = evaluateOptimalFontSize(
      this.render.ctx,
      content,
      {
        fontSize: this.config.font?.fontSize || DEFAULT_FONT_SIZE,
        family: this.config.font?.family || DEFAULT_FONT_FAMILY,
        color: ''
      },
      availableWidth,
      availableHeight
    )
    this.render.ctx.font = `${optimalFontSize}px ${this.config.font?.family || DEFAULT_FONT_FAMILY}`

    const result = getSafeText(this.render.ctx, content, availableWidth, {})
    if (!result) { return }
    if (result.width >= w || optimalFontSize >= h) { return }
    const { text, width } = result

    const textX = x + Math.round((w - width) / 2)
    const textY = y + (node.children && node.children.length > 0 ? Math.round(titleAreaHeight / 2) : Math.round(h / 2))
    this.textLayer.add(
      createTitleText(
        text,
        textX,
        textY,
        `${optimalFontSize}px ${this.config.font?.family || DEFAULT_FONT_FAMILY}`,
        this.config.font?.color || DEFAULT_FONT_COLOR
      )
    )
    for (const child of node.children) {
      this.drawText(child)
    }
  }
  draw(flush = true) {
    // prepare data
    const { width, height } = this.render.options

    const config: Required<GraphicLayout> = {
      titleAreaHeight: this.config.layout?.titleAreaHeight || DEFAULT_TITLE_AREA_HEIGHT,
      rectRadius: this.config.layout?.rectRadius || DEFAULT_RECT_BORDER_RADIUS,
      rectGap: this.config.layout?.rectGap || DEFAULT_RECT_GAP
    }

    this.layoutNodes = squarify(this.data, { w: width, h: height, x: 0, y: 0 }, config)

    if (flush) {
      const result = this.pluginDriver.cascadeHook('onModuleInit', this.layoutNodes)
      if (result) {
        this.colorMappings = result.colorMappings!
      }
    }
    for (const node of this.layoutNodes) {
      this.drawBroundRect(node)
    }

    for (const node of this.layoutNodes) {
      this.drawText(node)
    }
    this.add(this.rectLayer, this.textLayer)
    this.update()
  }
  cleanup() {
    this.remove(this.rectLayer, this.textLayer)
    this.rectLayer.destory()
    this.textLayer.destory()
  }
}

export function evaluateOptimalFontSize(
  c: CanvasRenderingContext2D,
  text: string,
  config: Required<GraphicFont>,
  desiredW: number,
  desiredH: number
) {
  desiredW = Math.floor(desiredW)
  desiredH = Math.floor(desiredH)
  const { fontSize, family } = config
  let min = fontSize.min
  let max = fontSize.max
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

function measureTextWidth(c: CanvasRenderingContext2D, text: string) {
  return c.measureText(text).width
}
