/* eslint-disable no-use-before-define */
import type { Rect, SquarifedModule } from './primitives'

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

export interface TreemapOptions {
  data: SquarifedModule[]
  evt?: Partial<PaintEventMap>
}

export interface Treemap {
  init: (element: HTMLDivElement) => Treemap
  dispose: () => void
  setOptions: (options?: TreemapOptions) => void
  zoom: () => void
  resize: () => void
}
