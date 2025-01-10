import { createCanvasElement } from '../../shared'

export function writeBoundingRectForCanvas(c: HTMLCanvasElement, w: number, h: number, dpr: number) {
  c.width = w * dpr
  c.height = h * dpr
  c.style.cssText = `width: ${w}px; height: ${h}px`
}

export interface RenderViewportOptions {
  width: number
  height: number
  devicePixelRatio: number
  shaow?: boolean
}

export class Canvas {
  canvas: HTMLCanvasElement
  ctx: CanvasRenderingContext2D
  constructor(options: RenderViewportOptions) {
    this.canvas = createCanvasElement()
    this.setOptions(options)
    this.ctx = this.canvas.getContext('2d')!
  }

  setOptions(options: RenderViewportOptions) {
    writeBoundingRectForCanvas(this.canvas, options.width, options.height, options.devicePixelRatio)
  }
}

export class Render {
  options: RenderViewportOptions
  private container: Canvas
  constructor(to: HTMLElement, options: RenderViewportOptions) {
    this.container = new Canvas(options)
    this.options = options
    this.initOptions(options)
    if (!options.shaow) {
      to.appendChild(this.container.canvas)
    }
  }

  clear(width: number, height: number) {
    this.ctx.clearRect(0, 0, width, height)
  }

  get canvas() {
    return this.container.canvas
  }

  get ctx() {
    return this.container.ctx
  }

  initOptions(userOptions: Partial<RenderViewportOptions> = {}) {
    Object.assign(this.options, userOptions)
    this.container.setOptions(this.options)
  }

  destory() {
  }
}
