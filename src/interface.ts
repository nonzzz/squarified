import type { PaintEventMap } from './events'
import type { Module, Rect } from './primitives'

export type PaintRect = Rect

export type GetAction = 'depth' | 'parent'

export interface StateAction {
  set: (action: string, payload: any) => void
  get: (action: string) => any
}

export interface TreemapContext {
  zoom: () => void
  get: (action: GetAction, payload?: any) => any
  state: StateAction
}

export interface PaintEvent<E> {
  nativeEvent: E
  module: any
}

export interface RGBColor {
  r: number
  g: number
  b: number
  a?: number
}

export interface HLSColor {
  h: number
  l: number
  s: number
  a?: number
}

export type ColorMode = 'rgb' | 'hsl'

export interface ColorDecoratorResultHLS {
  mode: 'hsl'
  desc: HLSColor
}

export interface ColorDecoratorResultRGB {
  mode: 'rgb'
  desc: RGBColor
}

export type ColorDecoratorResult = ColorDecoratorResultHLS | ColorDecoratorResultRGB

export interface Range<T> {
  max: T
  min: T
}

export interface GroupDecorator {
  gap: number
  borderWidth: number
  borderRadius: number
  barHeight: Range<number>
}

export interface TextDecorator {
  fontFamily: string
  fontSize: Range<number>
  color: string
}

// unlike the fomatree
// we provide a simple colorDecorator method
export interface PaintView {
  colorDecorator: (this: TreemapContext, module: Module) => ColorDecoratorResult
  groupDecorator: GroupDecorator
  textDecorator: TextDecorator
}

export interface TreemapOptions {
  data: Module[]
  evt?: Partial<PaintEventMap>
  view?: Partial<PaintView>
}

export interface Treemap {
  init: (element: HTMLDivElement) => Treemap
  dispose: () => void
  setOptions: (options?: TreemapOptions) => void
  resize: () => void
}
