import { applyCanvasTransform } from '../../shared'
import { Canvas, writeBoundingRectForCanvas } from '../schedule/render'
import type { RenderViewportOptions } from '../schedule/render'
import { C } from './box'
import { S } from './display'
import { DisplayType } from './types'
import type { LocOptions } from './display'

export class Layer extends C implements S {
  private c: Canvas
  __refresh__: boolean
  options: RenderViewportOptions
  width: number
  height: number
  x: number
  y: number
  scaleX: number
  scaleY: number
  rotation: number
  skewX: number
  skewY: number

  constructor(options: Partial<LocOptions> = {}) {
    super()
    this.c = new Canvas({ width: 0, height: 0, devicePixelRatio: 1 })
    this.__refresh__ = false
    this.options = Object.create(null)
    this.width = options.width || 0
    this.height = options.height || 0
    this.x = options.x || 0
    this.y = options.y || 0
    this.scaleX = options.scaleX || 1
    this.scaleY = options.scaleY || 1
    this.rotation = options.rotation || 0
    this.skewX = options.skewX || 0
    this.skewY = options.skewY || 0
  }

  get __instanceOf__(): DisplayType.Layer {
    return DisplayType.Layer
  }

  setCanvasOptions(options: Partial<RenderViewportOptions> = {}) {
    Object.assign(this.options, options)
    writeBoundingRectForCanvas(this.c.c.canvas, options.width || 0, options.height || 0, options.devicePixelRatio || 1)
  }

  cleanCacheSnapshot() {
    const dpr = this.options.devicePixelRatio || 1
    const matrix = this.matrix.create({ a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 })
    this.ctx.clearRect(0, 0, this.options.width, this.options.height)
    return { dpr, matrix }
  }

  setCacheSnapshot(c: HTMLCanvasElement) {
    const { matrix, dpr } = this.cleanCacheSnapshot()
    matrix.transform(this.x, this.y, this.scaleX, this.scaleY, this.rotation, this.skewX, this.skewY)
    applyCanvasTransform(this.ctx, matrix, dpr)
    this.ctx.drawImage(c, 0, 0, this.options.width / dpr, this.options.height / dpr)
    this.__refresh__ = true
  }

  initLoc(options: Partial<LocOptions> = {}) {
    this.x = options.x || 0
    this.y = options.y || 0
    this.scaleX = options.scaleX || 1
    this.scaleY = options.scaleY || 1
    this.rotation = options.rotation || 0
    this.skewX = options.skewX || 0
    this.skewY = options.skewY || 0
  }

  draw(ctx: CanvasRenderingContext2D) {
    const matrix = this.matrix.create({ a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 })
    matrix.transform(this.x, this.y, this.scaleX, this.scaleY, this.rotation, this.skewX, this.skewY)
    applyCanvasTransform(ctx, matrix, this.options.devicePixelRatio || 1)
    ctx.drawImage(this.canvas, 0, 0)
  }

  get canvas() {
    return this.c.c.canvas
  }

  get ctx() {
    return this.c.c.ctx
  }
}
