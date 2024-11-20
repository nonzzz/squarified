import { Render } from '../etoile'
import { log } from '../etoile/native/log'
import { TreemapLayout } from './component'
import type { App } from './component'

export abstract class RegisterModule {
  abstract init(app: App, treemap: TreemapLayout, render: Render): void
}

export function registerModuleForSchedule(mod: RegisterModule) {
  if (mod instanceof RegisterModule) {
    return (app: App, treemap: TreemapLayout, render: Render) => mod.init(app, treemap, render)
  }
  throw new Error(log.error('The module is not a valid RegisterScheduleModule.'))
}
