import type { SquarifedModule } from './primitives'

export interface TreemapContext {
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
  // zoom: () => void
  // resize: () => void
  // setOptions: (options: any) => void
}

export interface PaintRect {
  w: number
  h: number
}
