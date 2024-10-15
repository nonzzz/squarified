export type Module = Record<string, any> & {
  id: string
  groups: Module[]
}

export type SquarifiedModule = Module & {
  weight: number
  groups: SquarifiedModule[]
  parent?: SquarifiedModule
}

export type SquarifiedModuleWithLayout = Omit<SquarifiedModule, 'groups'> & {
  layout: [number, number, number, number]
  children: SquarifiedModuleWithLayout[]
}

export interface Rect {
  w: number
  h: number
}
