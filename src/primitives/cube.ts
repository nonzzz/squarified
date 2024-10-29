import { Animation, Render, Schedule } from '../etoile'
import type { App } from './component'
import { InheritedCollections, RegisterModule } from './registry'

export interface CubeMethods {
  animate: Animation
}

export class Cube extends RegisterModule {
  animation: Animation
  constructor() {
    super()
    this.animation = new Animation()
  }

  init(app: App, schedule: Schedule, render: Render): void {
    const methods: InheritedCollections[] = [
      {
        name: 'animate',
        fn: () => this.animation
      }
    ]
    RegisterModule.mixin(schedule, methods)
  }
}
