/* eslint-disable no-use-before-define */
import { Box, Schedule } from './etoile'
import type { ColorDecoratorResult } from './etoile/native/runtime'
import type { GraphicConfig, GraphicLayout, Series } from './interface'
import type { LayoutModule } from './primitives/squarify'
import { squarify } from './primitives/squarify'
import type { NativeModule } from './primitives/struct'
import { createRoundBlock } from './shared'
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
  // private drawText(node: LayoutModule) {

  // }
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
      console.log(result)
      if (result) {
        this.colorMappings = result.colorMappings!
      }
    }
    for (const node of this.layoutNodes) {
      this.drawBroundRect(node)
    }

    // for (const node of this.layoutNodes) {
    //   this.drawText(node)
    // }
    this.add(this.rectLayer)
    this.update()
  }
  cleanup() {
    this.remove(this.rectLayer, this.textLayer)
    this.rectLayer.destory()
    this.textLayer.destory()
  }
}
