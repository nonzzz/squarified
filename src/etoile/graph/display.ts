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
  Text = 'Text',
  // eslint-disable-next-line no-unused-vars
  Layer = 'Layer'
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

export interface InstructionAssignMappings {
  fillStyle: (arg: string) => void
  strokeStyle: (arg: string) => void
  font: (arg: string) => void
  lineWidth: (arg: number) => void
  textAlign: (arg: CanvasTextAlign) => void
  textBaseline: (arg: CanvasTextBaseline) => void
}

export interface InstructionWithFunctionCall {
  fillRect: (x: number, y: number, w: number, h: number) => void
  strokeRect: (x: number, y: number, w: number, h: number) => void
  fillText: (text: string, x: number, y: number, maxWidth?: number) => void
}

type Mod<
  T extends InstructionAssignMappings & InstructionWithFunctionCall = InstructionAssignMappings & InstructionWithFunctionCall,
  K extends keyof T = keyof T
> = T[K] extends (...args: any) => any ? [K, Parameters<T[K]>] : never

interface Instruction extends InstructionAssignMappings, InstructionWithFunctionCall {
  mods: Mod[]
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
    fillStyle(...args) {
      this.mods.push(['fillStyle', args])
    },
    fillRect(...args) {
      this.mods.push(['fillRect', args])
    },
    strokeStyle(...args) {
      this.mods.push(['strokeStyle', args])
    },
    lineWidth(...args) {
      this.mods.push(['lineWidth', args])
    },
    strokeRect(...args) {
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
  __options__: Partial<LocOptions>
  abstract style: GraphStyleSheet
  constructor(options: Partial<GraphOptions> = {}) {
    super(options)
    this.instruction = createInstruction()
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
