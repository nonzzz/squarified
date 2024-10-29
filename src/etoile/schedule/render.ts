import { Schedule } from '../schedule'

export interface RenderViewportOptions {
  width: number
  height: number
  devicePixelRatio: number
}

export class Render {
  canvas: HTMLCanvasElement
  ctx: CanvasRenderingContext2D
  options: RenderViewportOptions
  constructor(to: Element, options: RenderViewportOptions) {
    this.canvas = document.createElement('canvas')
    this.ctx = this.canvas.getContext('2d')!
    this.options = options
    this.initOptions(options)
    to.appendChild(this.canvas)
  }

  clear(width: number, height: number) {
    this.ctx.clearRect(0, 0, width, height)
  }

  initOptions(userOptions: Partial<RenderViewportOptions> = {}) {
    Object.assign(this.options, userOptions)
    const { options } = this
    this.canvas.width = options.width * options.devicePixelRatio
    this.canvas.height = options.height * options.devicePixelRatio
    this.canvas.style.cssText = `width: ${options.width}px; height: ${options.height}px`
  }

  update(schedule: Schedule) {
    this.clear(this.options.width, this.options.height)
    // schedule
    schedule.execute(this)
  }

  destory() {
  }
}
