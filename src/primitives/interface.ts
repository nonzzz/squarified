export type Module = Record<string, any> & {
  groups: Module[]
}

export type SquarifedModule = Module & {
  weight: number
}

export type SquarifedModuleWithLayout = Omit<SquarifedModule, 'groups'> & {
  layout: [number, number, number, number]
  children: SquarifedModuleWithLayout[]
}
