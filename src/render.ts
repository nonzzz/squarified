import type { PaintRect, Treemap, TreemapOptions } from './interface'
import type { SquarifedModule } from './primitives'

class Paint implements Treemap {
  private mountedNode: HTMLDivElement | null
  private _canvas: HTMLCanvasElement | null
  private _context: CanvasRenderingContext2D | null
  private rect: PaintRect
  private data: SquarifedModule[]
  constructor() {
    this.mountedNode = null
    this._canvas = null
    this._context = null
    this.rect = { w: 0, h: 0 }
    this.data = []
  }

  private deinitEventMaps() {
  }

  private deinit(release = true) {
    if (!this.mountedNode) return
    this.deinitEventMaps()
    this.mountedNode.removeChild(this._canvas!)
    if (release) {
      this.mountedNode = null
    }
    this._canvas = null
    this._context = null
    this.data = []
    this.rect = { w: 0, h: 0 }
  }

  private get canvas() {
    if (!this._canvas) throw new Error('Canvas not initialized')
    return this._canvas
  }

  //   notice the difference in the following two snippets
  //   ctx is the canvas context
  //   context is a special paint context
  private get ctx() {
    if (!this._context) throw new Error('Context not initialized')
    return this._context
  }

  private get context() {
    return {}
  }

  init(element: HTMLDivElement) {
    this.deinit(true)
    this.mountedNode = element
    this._canvas = document.createElement('canvas')
    this._canvas = document.createElement('canvas')
    this._context = this._canvas.getContext('2d')
    this.mountedNode.appendChild(this._canvas)
    return this
  }

  dispose() {
    this.deinit(true)
  }

  setOptions(options?: TreemapOptions) {
    if (!options) return
    const { evt: userEvent, data } = options
    this.data = data
    const unReady = !this.data.length
    if (unReady) {
      if (this.mountedNode && this.canvas) {
        this.deinit()
      }
      return
    }
    if (!this._canvas) {
      this.init(this.mountedNode!)
    }
  }
}

export function createTreemap() {
  return new Paint()
}
