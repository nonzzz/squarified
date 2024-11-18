import { createCanvasElement } from '../../shared'
import { Schedule } from '../schedule'

export function writeBoundingRectForCanvas(c: HTMLCanvasElement, w: number, h: number, dpr: number) {
  c.width = w * dpr
  c.height = h * dpr
  c.style.cssText = `width: ${w}px; height: ${h}px`
}

export interface RenderViewportOptions {
  width: number
  height: number
  devicePixelRatio: number
}

export class Canvas {
  private canvas: HTMLCanvasElement
  private ctx: CanvasRenderingContext2D
  constructor(options: RenderViewportOptions) {
    this.canvas = createCanvasElement()
    writeBoundingRectForCanvas(this.canvas, options.width, options.height, options.devicePixelRatio)
    this.ctx = this.canvas.getContext('2d')!
  }

  get c() {
    return { canvas: this.canvas, ctx: this.ctx }
  }
}

export class Render {
  private c: Canvas
  options: RenderViewportOptions
  constructor(to: Element, options: RenderViewportOptions) {
    this.c = new Canvas(options)
    this.options = options
    this.initOptions(options)
    to.appendChild(this.canvas)
  }

  clear(width: number, height: number) {
    this.ctx.clearRect(0, 0, width, height)
  }

  get canvas() {
    return this.c.c.canvas
  }

  get ctx() {
    return this.c.c.ctx
  }

  initOptions(userOptions: Partial<RenderViewportOptions> = {}) {
    Object.assign(this.options, userOptions)
    writeBoundingRectForCanvas(this.canvas, this.options.width, this.options.height, this.options.devicePixelRatio)
  }

  update(schedule: Schedule) {
    this.clear(this.options.width, this.options.height)
    schedule.execute(this)
  }

  destory() {
  }
}
