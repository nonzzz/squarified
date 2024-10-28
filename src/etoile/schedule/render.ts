import { Schedule } from '../schedule'

export interface RenderViewportOptions {
  width: number
  height: number
  devicePixelRatio: number
}

export class Render {
  canvas: HTMLCanvasElement
  ctx: CanvasRenderingContext2D
  constructor(to: Element, options: RenderViewportOptions) {
    this.canvas = document.createElement('canvas')
    this.ctx = this.canvas.getContext('2d')!
    this.canvas.width = options.width * options.devicePixelRatio
    this.canvas.height = options.height * options.devicePixelRatio
    this.canvas.style.cssText = `width: ${options.width}px; height: ${options.height}px`
    to.appendChild(this.canvas)
  }

  clear(width: number, height: number) {
    this.ctx.clearRect(0, 0, width, height)
  }

  update(schedule: Schedule) {
    this.clear(this.canvas.width, this.canvas.height)
    // schedule
    schedule.execute(this.ctx)
  }

  destory() {
  }
}
