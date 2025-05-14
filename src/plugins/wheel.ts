import { definePlugin } from '../shared/plugin-driver'

export const presetScalePlugin = definePlugin({
  name: 'treemap:preset-scale',
  onDOMEventTriggered(name, event, module, { stateManager: state, matrix, component }) {
    if (name === 'wheel') {
      //
    }
  }
})
