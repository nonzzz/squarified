import type { Plugin } from '../primitives/fly'
import { mixin } from '../shared'

export const zoom: Plugin = {
  name: 'zoom',
  handler: (app, evt) => {
    // evt.
    mixin(app, [
      {
        name: 'zoom',
        fn: () => {
          //
        }
      }
    ])
  }
}
