import { App } from './primitives'

export function createTreemap() {
  return new App()
}

export { c2m, flatten as flattenModule, sortChildrenByKey } from './primitives/struct'

export * from './etoile'
