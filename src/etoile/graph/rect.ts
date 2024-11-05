import { runtime } from '../native/runtime'
import type { ColorDecoratorResult } from '../native/runtime'
import { Graph, GraphStyleSheet } from './display'
import type { GraphOptions } from './display'

export type RectStyleOptions = GraphStyleSheet & { fill: ColorDecoratorResult }

export type RectOptions = GraphOptions & { style: Partial<RectStyleOptions> }
export class Rect extends Graph {
  style: Required<RectStyleOptions>
  constructor(options: Partial<RectOptions> = {}) {
    super(options)
    this.style = options.style || Object.create(null)
  }

  create() {
    if (this.style.fill) {
      this.instruction.fillStyle(runtime.evaluateFillStyle(this.style.fill, this.style.opacity))
      this.instruction.fillRect(0, 0, this.width, this.height)
    }
    if (this.style.stroke) {
      this.instruction.strokeStyle(this.style.stroke)
      if (typeof this.style.lineWidth === 'number') {
        this.instruction.lineWidth(this.style.lineWidth)
      }
      this.instruction.strokeRect(0, 0, this.width, this.height)
    }
  }
}
