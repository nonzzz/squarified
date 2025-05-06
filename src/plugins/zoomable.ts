import { mixinWithParams } from '../shared'
import { definePlugin } from '../shared/plugin-driver'

export const presetZoomablePlugin = definePlugin({
  name: 'treemap:preset-zoomable',
  onLoad(treemap) {
    return mixinWithParams(treemap, [
      {
        name: 'zoom',
        fn: () => (id: string) => {
          console.log('zoomable', id)
        }
      }
    ])
  }
})
