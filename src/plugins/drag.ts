import { definePlugin } from '../shared/plugin-driver'
import type { PluginContext } from '../shared/plugin-driver'
import type { HighlightMeta } from './highlight'

interface DragOptions {
  x: number
  y: number
}

interface DragMetadata {
  dragOptions: DragOptions
}

export const presetDragElementPlugin = definePlugin({
  name: 'treemap:preset-drag-element',
  onDOMEventTriggered(name, event, module, { stateManager: state, matrix, component }) {
    switch (name) {
      case 'mousemove': {
        break
      }
      case 'mouseup': {
        break
      }
      case 'mousedown': {
        if (isScrollWheelOrRightButtonOnMouseupAndDown(event.native)) {
          return
        }
        const meta = getDragOptions.call(this)
        if (!meta) {
          return
        }
        meta.dragOptions.x = event.native.offsetX
        meta.dragOptions.y = event.native.offsetY
        state.transition('PRESSED')
        break
      }
    }
  },
  meta: {
    dragOptions: {
      x: 0,
      y: 0
    } satisfies DragOptions
  }
})

function getHighlightInstance(this: PluginContext) {
  return this.getPluginMetadata<HighlightMeta>('treemap:preset-highlight')
}

function getDragOptions(this: PluginContext) {
  const meta = this.getPluginMetadata<DragMetadata>('treemap:preset-drag-element')
  return meta
}

interface DuckE {
  which: number
}

function isScrollWheelOrRightButtonOnMouseupAndDown<E extends DuckE = DuckE>(e: E) {
  return e.which === 2 || e.which === 3
}
