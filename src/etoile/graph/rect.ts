import { Graph } from './display'

export class Rect extends Graph {
  create() {
    if (this.style.fill) {
      this.instruction.fillStyle(this.style.fill)
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
