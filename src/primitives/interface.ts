export type Module = Record<string, any> & {
  groups: Module[]
}

export type SquarifiedModule = Module & {
  weight: number
}

export type SquarifiedModuleWithLayout = Omit<SquarifiedModule, 'groups'> & {
  layout: [number, number, number, number]
  children: SquarifiedModuleWithLayout[]
}

export interface Rect {
  w: number
  h: number
}
