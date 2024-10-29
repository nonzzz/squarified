import { Render, Schedule } from '../etoile'
import { log } from '../etoile/native/log'
import type { App } from './component'

export interface InheritedCollections {
  name: string
  fn: (instance: App) => void
}

export abstract class RegisterModule {
  abstract init(app: App, schedule: Schedule, render: Render): void
  static mixin(app: App, methods: InheritedCollections[]) {
    methods.forEach(({ name, fn }) => {
      Object.defineProperty(app, name, {
        value: fn(app),
        writable: false
      })
    })
  }
}

export function registerModuleForSchedule(mod: RegisterModule) {
  if (mod instanceof RegisterModule) {
    return (app: App, schedule: Schedule, render: Render) => mod.init(app, schedule, render)
  }
  throw new Error(log.error('The module is not a valid RegisterScheduleModule.'))
}