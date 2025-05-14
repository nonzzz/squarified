import { definePlugin } from '../shared/plugin-driver'
import type { PluginContext } from '../shared/plugin-driver'
import { ANIMATION_DURATION, smoothFrame, stackMatrixTransformWithGraphAndLayer } from './highlight'
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
        const { offsetX, offsetY } = event.native
        const meta = getDragOptions.call(this)
        if (!meta) {
          return
        }
        if (meta.dragOptions.x === offsetX && meta.dragOptions.y === offsetY) {
          state.transition('IDLE')
          return
        }
        state.transition('DRAGGING')
        if (state.isInState('DRAGGING')) {
          const highlight = getHighlightInstance.call(this)
          smoothFrame((_, cleanup) => {
            cleanup()
            const { offsetX, offsetY } = event.native
            const drawX = offsetX - meta.dragOptions.x
            const drawY = offsetY - meta.dragOptions.y
            if (highlight?.highlight) {
              highlight.highlight.reset()
              highlight.highlight.setZIndexForHighlight()
            }
            matrix.translation(drawX, drawY)
            meta.dragOptions.x = offsetX
            meta.dragOptions.y = offsetY
            component.cleanup()
            component.draw(false, false)
            stackMatrixTransformWithGraphAndLayer(component.elements, matrix.e, matrix.f, 1)
            component.update()
            return true
          }, {
            duration: ANIMATION_DURATION
          })
        }

        break
      }
      case 'mouseup': {
        if (state.isInState('DRAGGING') && state.canTransition('IDLE')) {
          const highlight = getHighlightInstance.call(this)
          if (highlight && highlight.highlight) {
            highlight.highlight.reset()
            highlight.highlight.setZIndexForHighlight()
          }
          const meta = getDragOptions.call(this)
          if (meta && meta.dragOptions) {
            meta.dragOptions.x = 0
            meta.dragOptions.y = 0
            state.transition('IDLE')
          }
        }

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
