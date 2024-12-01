import { runtime } from '../native/runtime'
import type { ColorDecoratorResult } from '../native/runtime'
import { DisplayType } from './types'
import { Graph } from './display'
import type { GraphOptions, GraphStyleSheet } from './display'

export type RectStyleOptions = GraphStyleSheet & { fill: ColorDecoratorResult; margin?: number }

export type RectOptions = GraphOptions & { style: Partial<RectStyleOptions> }
export class Rect extends Graph {
  style: Required<RectStyleOptions>
  constructor(options: Partial<RectOptions> = {}) {
    super(options)
    this.style = options.style || Object.create(null)
  }

  get __shape__() {
    return DisplayType.Rect
  }

  create() {
    const margin = this.style.margin || 0
    const x = margin
    const y = margin
    const width = this.width - margin * 2
    const height = this.height - margin * 2
    if (this.style.fill) {
      this.instruction.fillStyle(runtime.evaluateFillStyle(this.style.fill, this.style.opacity))
      this.instruction.fillRect(x, y, width, height)
    }
    if (this.style.stroke) {
      this.instruction.strokeStyle(this.style.stroke)
      if (typeof this.style.lineWidth === 'number') {
        this.instruction.lineWidth(this.style.lineWidth)
      }
      this.instruction.strokeRect(x, y, width, height)
    }
  }

  clone() {
    return new Rect({ ...this.style, ...this.__options__ })
  }
}

export type RoundRectStyleOptions = RectStyleOptions & { radius: number }

export type RoundRectOptions = RectOptions & { style: Partial<RoundRectStyleOptions> }

export class RoundRect extends Graph {
  style: Required<RoundRectStyleOptions>
  constructor(options: Partial<RoundRectOptions> = {}) {
    super(options)
    this.style = options.style || Object.create(null)
  }

  get __shape__() {
    return DisplayType.RoundRect
  }

  create() {
    const margin = this.style.margin
    const x = margin
    const y = margin
    const width = this.width - margin * 2
    const height = this.height - margin * 2
    const radius = this.style.radius || 0
    this.instruction.beginPath()
    this.instruction.moveTo(x + radius, y)
    this.instruction.arcTo(x + width, y, x + width, y + height, radius)
    this.instruction.arcTo(x + width, y + height, x, y + height, radius)
    this.instruction.arcTo(x, y + height, x, y, radius)
    this.instruction.arcTo(x, y, x + width, y, radius)
    this.instruction.closePath()
    if (this.style.fill) {
      this.instruction.closePath()
      this.instruction.fillStyle(runtime.evaluateFillStyle(this.style.fill, this.style.opacity))
      this.instruction.fill()
    }
    if (this.style.stroke) {
      if (typeof this.style.lineWidth === 'number') {
        this.instruction.lineWidth(this.style.lineWidth)
      }
      this.instruction.strokeStyle(this.style.stroke)
      this.instruction.stroke()
    }
  }

  clone() {
    return new RoundRect({ ...this.style, ...this.__options__ })
  }
}
