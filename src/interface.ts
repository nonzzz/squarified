/* eslint-disable no-use-before-define */
import type { Module, Rect, SquarifiedModule } from './primitives'

export type PaintRect = Rect

export interface TreemapContext {
  zoom: Treemap['zoom']
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

// unlike the fomatree
// we provide a simple colorDecorator method
export interface PaintView {
  colorDecorator: (module: Module, parent: Module | null) => ColorDecoratorResult
}

export interface TreemapOptions {
  data: SquarifiedModule[]
  evt?: Partial<PaintEventMap>
  view?: Partial<PaintView>
}

export interface Treemap {
  init: (element: HTMLDivElement) => Treemap
  dispose: () => void
  setOptions: (options?: TreemapOptions) => void
  zoom: () => void
  resize: () => void
}
