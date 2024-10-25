/* eslint-disable no-use-before-define */

const SELF_ID = {
  id: 0,
  get() {
    return this.id++
  }
}

export class Display {
  parent: Display | null
  id: number
  constructor() {
    this.parent = null
    this.id = SELF_ID.get()
  }

  destory() {
    //
  }
}

export interface GraphOptions {
  width: number
  height: number
  x: number
  y: number
}

export abstract class Graph extends Display {
  width: number
  height: number
  x: number
  y: number
  constructor(options: Partial<GraphOptions> = {}) {
    super()
    this.width = options.width || 0
    this.height = options.height || 0
    this.x = options.x || 0
    this.y = options.y || 0
  }
  abstract create(ctx: CanvasRenderingContext2D): void
}
