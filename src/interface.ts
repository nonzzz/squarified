import type { Module, Rect } from './primitives'

export type PaintRect = Rect

export type GetAction = 'depth' | 'parent'

export interface TreemapContext {
  zoom: () => void
  get: (action: GetAction, payload?: any) => any
}

export interface PaintEvent<E> {
  nativeEvent: E
  module: any
}

export interface PaintEventMap {
  mousemove: (this: TreemapContext, event: PaintEvent<MouseEvent>) => void
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

export interface GroupDecorator {
  borderWidth: number
  borderRadius: number
  borderGap: number
}

// unlike the fomatree
// we provide a simple colorDecorator method
export interface PaintView {
  colorDecorator: (module: Module) => ColorDecoratorResult
  groupDecorator: GroupDecorator
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
