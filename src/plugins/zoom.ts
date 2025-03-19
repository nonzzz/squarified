import { definePlugin } from '../primitives/fly'
import { mixin } from '../shared'

export const zoom= definePlugin({
  name: 'zoom',
  handler: (app, evt) => {
    // evt.
    return mixin(app, [
      {
        name: 'zoom',
        fn: () => {
          //
        }
      },
      {
        name: 'zoom2',
        fn: () => {
          //
        }
      }
    ])
  }
})
