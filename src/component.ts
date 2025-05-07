/* eslint-disable no-use-before-define */
import { Box, Schedule } from './etoile'
import type { ColorDecoratorResult } from './etoile/native/runtime'
import { defaultLayoutOptions } from './primitives/decorator'
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

export class Component extends Schedule {
  pluginDriver: PluginDriver<Component>
  data: NativeModule[]
  colorMappings: ColorMappings
  rectLayer: Box
  textLayer: Box
  layoutNodes: LayoutModule[]
  constructor(...args: ConstructorParameters<typeof Schedule>) {
    super(...args)
    this.data = []
    this.colorMappings = {}
    this.pluginDriver = new PluginDriver(this)
    this.rectLayer = new Box()
    this.textLayer = new Box()
    this.layoutNodes = []
  }
  private drawBroundRect(node: LayoutModule) {
    const [x, y, w, h] = node.layout
    const padding = 2
    if (w - padding * 2 <= 0 || h - padding * 2 <= 0) {
      return
    }
    const fill = this.colorMappings[node.node.id] || DEFAULT_RECT_FILL_DESC
    const rect = createRoundBlock(x, y, w, h, { fill, padding, radius: 4 })
    rect.__widget__ = node
    this.rectLayer.add(rect)
    for (const child of node.children) {
      this.drawBroundRect(child)
    }
  }
  private drawText(node: LayoutModule) {
    // const [x, y, w, h] = node.layout
    // if (!w || !h) { return }
    // const { titleHeight, rectGap } = node.decorator
  }
  draw() {
    // prepare data
    const { width, height } = this.render.options
    this.layoutNodes = squarify(this.data, { w: width, h: height, x: 0, y: 0 }, defaultLayoutOptions)
    for (const node of this.layoutNodes) {
      this.drawBroundRect(node)
    }
    for (const node of this.layoutNodes) {
      this.drawText(node)
    }
    this.add(this.rectLayer)
    this.update()
  }
  cleanup() {
    this.remove(this.rectLayer, this.textLayer)
    this.rectLayer.destory()
    this.textLayer.destory()
  }
}
