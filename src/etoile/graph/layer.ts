import { Canvas, writeBoundingRectForCanvas } from '../schedule/render'
import type { RenderViewportOptions } from '../schedule/render'
import { C } from './box'
import { DisplayType } from './display'

export class Layer extends C {
  private c: Canvas
  private cacheCanvas: HTMLCanvasElement | null = null
  private cacheContext: CanvasRenderingContext2D | null = null
  __refresh__: boolean

  constructor() {
    super()
    this.c = new Canvas({ width: 0, height: 0, devicePixelRatio: 1 })
    this.__refresh__ = false
  }

  get __instanceOf__(): DisplayType.Layer {
    return DisplayType.Layer
  }

  setCanvasOptions(options: Partial<RenderViewportOptions> = {}) {
    writeBoundingRectForCanvas(this.c.c.canvas, options.width || 0, options.height || 0, options.devicePixelRatio || 1)
  }

  cache() {
  }

  draw() {
    if (this.cacheCanvas && this.cacheContext) {
      this.c.c.ctx.drawImage(this.cacheCanvas, 0, 0)
    } else {
      //   throw new Error('No cache canvas found')
    }
  }
}
