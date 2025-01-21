import { Canvas, asserts, canvasBoundarySize, drawGraphIntoCanvas, traverse } from '../etoile'
import type { RenderViewportOptions } from '../etoile'
import { Matrix2D } from '../etoile/native/matrix'
import { TreemapLayout, resetLayout } from './component'
import type { NativeModule } from './struct'

export abstract class Cache {
  abstract key: string
  abstract get state(): boolean
  abstract flush(...args: never): void
  abstract destroy(): void
}

// The following is my opinionated.
// For better performance, we desgin a cache system to store the render result.
// two step
// 1. draw current canvas into a cache canvas (offscreen canvas)
// 2. draw cache canvas into current canvas (note we should respect the dpi)
export class RenderCache extends Canvas implements Cache {
  key: string
  private $memory: boolean
  constructor(opts: RenderViewportOptions) {
    super(opts)
    this.key = 'render-cache'
    this.$memory = false
  }
  get state() {
    return this.$memory
  }
  flush(treemap: TreemapLayout, matrix = new Matrix2D()) {
    const { devicePixelRatio, width, height } = treemap.render.options
    const { a, d } = matrix
    const { size } = canvasBoundarySize
    // Check outof boundary
    if (width * a >= size || height * d >= size) {
      return
    }
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height)
    this.setOptions({ width: width * a, height: height * d, devicePixelRatio })
    resetLayout(treemap, width * a, height * d)
    drawGraphIntoCanvas(treemap, { c: this.canvas, ctx: this.ctx, dpr: devicePixelRatio })
    this.$memory = true
  }
  destroy() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height)
    this.$memory = false
  }
}

export class FontCache implements Cache {
  key: string
  private fonts: Record<string, number>
  ellispsis: Record<string, number>
  constructor() {
    this.key = 'font-cache'
    this.fonts = {}
    this.ellispsis = {}
  }
  get state() {
    return true
  }
  flush(treemap: TreemapLayout, matrix = new Matrix2D()) {
    const { width, height } = treemap.render.options
    const { a, d } = matrix

    const zoomedWidth = width * a
    const zoomedHeight = height * d
    if (zoomedWidth <= width || zoomedHeight <= height) {
      return
    }
    traverse([treemap.elements[0]], (graph) => {
      if (asserts.isRoundRect(graph)) {
        const { x, y, height: graphHeight, width: graphWidth } = graph
        if (!graphHeight || !graphWidth) {
          return
        }
        if (x >= 0 && y >= 0 && (x + graphWidth) <= width && (y + graphHeight) <= height) {
          if (graph.__widget__) {
            // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
            const node = graph.__widget__.node as unknown as NativeModule
            delete this.fonts[node.id]
            // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
            delete this.ellispsis[node.label]
          }
        }
      }
    })
  }
  destroy() {
    this.fonts = {}
    this.ellispsis = {}
  }
  queryFontById(id: string, byDefault: () => number) {
    if (!(id in this.fonts)) {
      this.fonts[id] = byDefault()
    }
    return this.fonts[id]
  }
}
