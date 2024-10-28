import { Box, Event, Rect, etoile } from '../etoile'
import type { PrimitiveEventDefinition } from './event'
import { bindParentForModule } from './struct'
import type { Module, NativeModule } from './struct'
import { squarify } from './squarify'
import type { LayoutModule } from './squarify'
import { SelfEvent } from './event'
import { registerModuleForSchedule } from './registry'

export interface TreemapOptions {
  data: Module[]
}

export interface App {
  init: (el: Element) => void
  dispose: () => void
  setOptions: (options: TreemapOptions) => void
  resize: () => void
}

type ExtendRegistry = Omit<Event<PrimitiveEventDefinition>, 'bindWithContext'>

const d = {
  titleAreaHeight: {
    max: 80,
    min: 20
  },
  rectGap: 5,
  rectBorderRadius: 0.5,
  rectBorderWidth: 1.5
}

const defaultRegistries = [
  registerModuleForSchedule(new SelfEvent())
]

export class TreemapLayout extends etoile.Schedule {
  data: NativeModule[]
  layoutNodes: LayoutModule[]
  private bgBox: Box
  private fgBox: Box
  constructor(...args: ConstructorParameters<typeof etoile.Schedule>) {
    super(...args)
    this.data = []
    this.layoutNodes = []
    this.bgBox = new Box()
    this.fgBox = new Box()
  }

  drawBackgroundNode(node: LayoutModule) {
    for (const child of node.children) {
      this.drawBackgroundNode(child)
    }
    const [x, y, w, h] = node.layout
    const { rectGap, rectBorderRadius, rectBorderWidth, titleHeight } = node.decorator
    function getRandomColor(): string {
      const r = Math.floor(Math.random() * 256)
      const g = Math.floor(Math.random() * 256)
      const b = Math.floor(Math.random() * 256)
      return `rgb(${r}, ${g}, ${b})`
    }
    if (node.children.length) {
      const top = new Rect({
        x,
        y,
        width: w,
        height: titleHeight,
        style: {
          fill: getRandomColor()
        }
      })
      const bottom = new Rect({
        x,
        y: y + h - rectGap,
        width: w,
        height: rectGap,
        style: {
          fill: getRandomColor()
        }
      })
      const left = new Rect({
        x,
        y: y + titleHeight,
        width: rectGap,
        height: h - titleHeight - rectGap,
        style: {
          fill: getRandomColor()
        }
      })

      const right = new Rect({
        x: x + w - rectGap,
        y: y + titleHeight,
        width: rectGap,
        height: h - titleHeight - rectGap,
        style: {
          fill: getRandomColor()
        }
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
        style: {
          fill: getRandomColor()
        }
      })
      this.bgBox.add(rect)
    }
    // const rect = new Rect({
    //   width: x+,
    //   height,
    //   x,
    //   y,
    //   style: {
    //     fill: getRandomColor()
    //   }
    // })
    // this.bgBox.add(rect)
  }

  drawForegroundNode(node: LayoutModule) {}

  draw() {
    this.remove(this.bgBox, this.fgBox)
    for (const node of this.layoutNodes) {
      this.drawBackgroundNode(node)
      this.drawForegroundNode(node)
    }
    this.add(this.bgBox, this.fgBox)
  }
}

export function createTreemap<E = ExtendRegistry>() {
  let treemap: TreemapLayout | null = null
  let root: Element | null = null

  const context = {
    init,
    dispose,
    setOptions,
    resize
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
    treemap.layoutNodes = squarify(treemap.data, { w: width, h: height, x: 0, y: 0 }, d)
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
    resize()
  }

  return context as App & E
}
