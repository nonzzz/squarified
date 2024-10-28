/* eslint-disable no-use-before-define */

import { Matrix2D } from '../native/matrix'

const SELF_ID = {
  id: 0,
  get() {
    return this.id++
  }
}

export class Display {
  parent: Display | null
  id: number
  matrix: Matrix2D
  constructor() {
    this.parent = null
    this.id = SELF_ID.get()
    this.matrix = new Matrix2D()
  }

  destory() {
    //
  }
}

export interface GraphStyleSheet {
  fill: string
  stroke: string
  opacity: number
  font: string
  lineWidth: number
}

export interface GraphOptions {
  width: number
  height: number
  x: number
  y: number
  scaleX: number
  scaleY: number
  rotation: number
  skewX: number
  skewY: number
  style: Partial<GraphStyleSheet>
}

type Mod = [string, ...any[]]

interface Instruction {
  mods: Mod[]
  fillStyle(...args: any[]): void
  fillRect(...args: any[]): void
  strokeStyle(...args: any[]): void
  lineWidth: (...args: any[]) => void
  strokeRect(...args: any[]): void
}

const ASSIGN_MAPPINGS = {
  fillStyle: !0,
  strokeStyle: !0,
  font: !0,
  lineWidth: !0
}

function createInstruction() {
  return <Instruction> {
    mods: [],
    fillStyle(...args: any[]) {
      this.mods.push(['fillStyle', args])
    },
    fillRect(...args: any[]) {
      this.mods.push(['fillRect', args])
    },
    strokeStyle(...args: any[]) {
      this.mods.push(['strokeStyle', args])
    },
    lineWidth(...args: any[]) {
      this.mods.push(['lineWidth', args])
    },
    strokeRect(...args: any[]) {
      this.mods.push(['strokeRect', args])
    }
  }
}

export abstract class Graph extends Display {
  width: number
  height: number
  x: number
  y: number
  scaleX: number
  scaleY: number
  rotation: number
  skewX: number
  skewY: number
  style: GraphStyleSheet
  instruction: ReturnType<typeof createInstruction>
  constructor(options: Partial<GraphOptions> = {}) {
    super()
    this.width = options.width || 0
    this.height = options.height || 0
    this.x = options.x || 0
    this.y = options.y || 0
    this.scaleX = options.scaleX || 1
    this.scaleY = options.scaleY || 1
    this.rotation = options.rotation || 0
    this.skewX = options.skewX || 0
    this.skewY = options.skewY || 0
    this.style = options.style || Object.create(null)
    this.instruction = createInstruction()
  }
  abstract create(): void

  render(ctx: CanvasRenderingContext2D) {
    this.create()
    this.instruction.mods.forEach((mod) => {
      const direct = mod[0]
      if (direct in ASSIGN_MAPPINGS) {
        // @ts-expect-error
        ctx[direct] = mod[1]
        return
      }
      // @ts-expect-error
      ctx[direct].apply(ctx, ...mod.slice(1))
    })
  }
}
