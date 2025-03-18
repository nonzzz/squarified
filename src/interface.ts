import type { ColorDecoratorResult } from './etoile/native/runtime'

export type ColorMappings = Record<string, ColorDecoratorResult>

export interface ComponentDefinition {
  colorScheme: ColorMappings
}
