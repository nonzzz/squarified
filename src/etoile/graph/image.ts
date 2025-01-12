import { DisplayType, Graph } from './display'
import type { GraphOptions, GraphStyleSheet } from './display'

export interface BitmapOptions extends Omit<GraphOptions, 'style'> {
  style: Partial<
    GraphStyleSheet & {
      font: string,
      textAlign: CanvasTextAlign,
      baseline: CanvasTextBaseline,
      lineWidth: number,
      fill: string
    }
  >
  bitmap: HTMLCanvasElement
}

export class Bitmap extends Graph {
  bitmap: HTMLCanvasElement | null
  style: Required<BitmapOptions['style']>
  constructor(options: Partial<BitmapOptions> = {}) {
    super(options)
    this.bitmap = options.bitmap || null
    this.style = (options.style || Object.create(null)) as Required<BitmapOptions['style']>
  }
  create() {
    if (this.bitmap) {
      this.instruction.drawImage(this.bitmap, 0, 0)
    }
  }
  clone() {
    return new Bitmap({ ...this.style, ...this.__options__ })
  }
  get __shape__() {
    return DisplayType.Bitmap
  }
}