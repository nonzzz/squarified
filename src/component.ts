import { Box, Schedule } from './etoile'
import type { ColorDecoratorResult } from './etoile/native/runtime'
import type { ColorMappings, ComponentDefinition } from './interface'
import { defaultLayoutOptions } from './primitives/decorator'
import { PluginDriver } from './primitives/fly'
import { squarify } from './primitives/squarify'
import type { LayoutModule } from './primitives/squarify'
import type { NativeModule } from './primitives/struct'
import { createRoundBlock } from './shared'

const DEFAULT_RECT_FILL_DESC: ColorDecoratorResult = {
  mode: 'rgb',
  desc: { r: 0, g: 0, b: 0 }
}

export class Component extends Schedule implements ComponentDefinition {
  name: string
  colorScheme: ColorMappings
  pluginDriver: PluginDriver
  data: NativeModule[]
  rectLayer: Box
  textLayer: Box
  constructor(...args: ConstructorParameters<typeof Schedule>) {
    super(...args)
    this.name = 'squarified-treemap'
    this.colorScheme = {}
    this.pluginDriver = new PluginDriver(this)
    this.data = []
    this.rectLayer = new Box()
    this.textLayer = new Box()
  }
  private drawBroundRect(node: LayoutModule) {
    const [x, y, w, h] = node.layout
    const padding = 2
    if (w - padding * 2 <= 0 || h - padding * 2 <= 0) {
      return
    }
    const fill = this.colorScheme[node.node.id] || DEFAULT_RECT_FILL_DESC
    const rect = createRoundBlock(x, y, w, h, { fill, padding, radius: 4 })
    rect.__widget__ = node
    this.rectLayer.add(rect)
    for (const child of node.children) {
      this.drawBroundRect(child)
    }
  }
  private drawText(node: LayoutModule) {
    //
  }
  draw() {
    // prepare data
    const { width, height } = this.render.options
    const layoutNodes = squarify(this.data, { w: width, h: height, x: 0, y: 0 }, defaultLayoutOptions)
    this.colorScheme = this.pluginDriver.seqScheme('color', layoutNodes)
    for (const node of layoutNodes) {
      this.drawBroundRect(node)
    }
    for (const node of layoutNodes) {
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
