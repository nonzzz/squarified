/* eslint-disable no-use-before-define */

import { Matrix2D } from '../native/matrix'

const SELF_ID = {
  id: 0,
  get() {
    return this.id++
  }
}

export const enum DisplayType {
  // eslint-disable-next-line no-unused-vars
  Graph = 'Graph',
  // eslint-disable-next-line no-unused-vars
  Box = 'Box',
  // eslint-disable-next-line no-unused-vars
  Rect = 'Rect',
  // eslint-disable-next-line no-unused-vars
  Text = 'Text'
}

export abstract class Display {
  parent: Display | null
  id: number
  matrix: Matrix2D
  abstract get __instanceOf__(): string
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
  stroke: string
  opacity: number
  font: string
  lineWidth: number
}

export interface LocOptions {
  width: number
  height: number
  x: number
  y: number
  scaleX: number
  scaleY: number
  rotation: number
  skewX: number
  skewY: number
}

export interface GraphOptions extends LocOptions {
}

type Mod = [string, ...any[]]

interface Instruction {
  mods: Mod[]
  fillStyle(...args: any[]): void
  fillRect(...args: any[]): void
  strokeStyle(...args: any[]): void
  lineWidth(...args: any[]): void
  strokeRect(...args: any[]): void
  fillText(...args: any[]): void
  font(...args: any[]): void
  textBaseline(...args: any[]): void
  textAlign(...args: any[]): void
}

const ASSIGN_MAPPINGS = {
  fillStyle: !0,
  strokeStyle: !0,
  font: !0,
  lineWidth: !0,
  textAlign: !0,
  textBaseline: !0
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
    },
    fillText(...args) {
      this.mods.push(['fillText', args])
    },
    font(...args) {
      this.mods.push(['font', args])
    },
    textBaseline(...args) {
      this.mods.push(['textBaseline', args])
    },
    textAlign(...args) {
      this.mods.push(['textAlign', args])
    }
  }
}

export abstract class S extends Display {
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
}

export abstract class Graph extends S {
  instruction: ReturnType<typeof createInstruction>
  __refresh__: boolean
  __options__: Partial<LocOptions>
  abstract style: GraphStyleSheet
  constructor(options: Partial<GraphOptions> = {}) {
    super(options)
    this.instruction = createInstruction()
    // For better performance
    this.__refresh__ = true
    this.__options__ = options
  }
  abstract create(): void
  abstract clone(): Graph
  abstract get __shape__(): string

  render(ctx: CanvasRenderingContext2D) {
    this.create()
    const cap = this.instruction.mods.length

    for (let i = 0; i < cap; i++) {
      const mod = this.instruction.mods[i]
      const [direct, ...args] = mod
      if (direct in ASSIGN_MAPPINGS) {
        // @ts-expect-error
        ctx[direct] = args[0]
        continue
      }

      // @ts-expect-error
      ctx[direct].apply(ctx, ...args)
    }
  }

  get __instanceOf__(): DisplayType.Graph {
    return DisplayType.Graph
  }
}
