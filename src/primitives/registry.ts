import { TreemapLayout } from './component'
import type { App } from './component'

export function register<M>(Mod: new (app: App, treemap: TreemapLayout) => M) {
  return (app: App, treemap: TreemapLayout) => {
    new Mod(app, treemap)
  }
}
