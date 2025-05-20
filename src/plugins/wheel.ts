import { Component } from '../component'
import type { DOMEventMetadata } from '../dom-event'
import { DOMEvent, isWheelEvent } from '../dom-event'
import { DEFAULT_MATRIX_LOC, Matrix2D } from '../etoile/native/matrix'
import { smoothFrame, stackMatrixTransformWithGraphAndLayer } from '../shared'
import { definePlugin } from '../shared/plugin-driver'
import type { PluginContext } from '../shared/plugin-driver'
import { getHighlightInstance } from './drag'
import { ANIMATION_DURATION } from './highlight'

interface ScaleOptions {
  scale: number
  minScale: number
  maxScale: number
  scaleFactor: number
}
interface ScaleMetadata {
  scaleOptions: ScaleOptions
}

// refer https://developer.mozilla.org/en-US/docs/Web/API/Element/mousewheel_event
// we shouldn't use wheelDelta property anymore.

export interface ScalePluginOptions {
  /**
   * @default Infinity
   * @description The maximum scale factor for the treemap.
   */
  max?: number
  /**
   * @default 0.1
   * @description The minimum scale factor for the treemap.
   */
  min?: number
}

export function presetScalePlugin(options?: ScalePluginOptions) {
  return definePlugin({
    name: 'treemap:preset-scale',
    onDOMEventTriggered(_, event, module, evt) {
      if (isWheelEvent(event)) {
        onWheel(this, event, evt)
      }
    },
    meta: {
      scaleOptions: {
        scale: 1,
        minScale: options?.min || 0.1,
        maxScale: options?.max || Infinity,
        scaleFactor: 0.05
      } satisfies ScaleOptions
    },
    onResize({ matrix, stateManager: state }) {
      const meta = getScaleOptions.call(this)
      if (meta) {
        meta.scaleOptions.scale = 1
      }
      matrix.create(DEFAULT_MATRIX_LOC)
      state.reset()
    }
  })
}

export function getScaleOptions(this: PluginContext) {
  const meta = this.getPluginMetadata<ScaleMetadata>('treemap:preset-scale')
  return meta
}

function onWheel(
  pluginContext: PluginContext,
  event: DOMEventMetadata<'wheel'>,
  { stateManager: state, component, matrix }: DOMEvent
) {
  event.native.preventDefault()
  const meta = getScaleOptions.call(pluginContext)
  if (!meta) { return }
  const { scale, minScale, maxScale, scaleFactor } = meta.scaleOptions

  const delta = event.native.deltaY < 0 ? scaleFactor : -scaleFactor
  const newScale = Math.max(minScale, Math.min(maxScale, scale + delta))
  if (newScale === scale) { return }

  state.transition('SCALING')
  const mouseX = event.native.offsetX
  const mouseY = event.native.offsetY

  const scaleDiff = newScale / scale

  meta.scaleOptions.scale = newScale

  const highlight = getHighlightInstance.apply(pluginContext)
  smoothFrame((_, cleanup) => {
    cleanup()
    if (highlight && highlight.highlight) {
      highlight.highlight.reset()
      highlight.highlight.setZIndexForHighlight()
    }

    matrix.scale(scaleDiff, scaleDiff)
    matrix.e = mouseX - (mouseX - matrix.e) * scaleDiff
    matrix.f = mouseY - (mouseY - matrix.f) * scaleDiff

    component.cleanup()

    calculateShouldUpdatedArea(matrix, component)

    component.draw(false, false)

    stackMatrixTransformWithGraphAndLayer(
      component.elements,
      matrix.e,
      matrix.f,
      newScale
    )
    component.update()

    if (state.canTransition('IDLE')) {
      state.transition('IDLE')
    }
    return true
  }, {
    duration: ANIMATION_DURATION
  })
}

// squarify will collapse the nodes
// so this is designed to flatten the nodes and rebuild the tree
// Need to be considered is component.draw should never pass flush and update parameters
// I guess modifying the node metadata directly via squarify is the right way.
// 1. calculate should be updated area
// 2. if updated area contains combined nodes flatten them and rebuild the tree
// 3. replace the nodes in the tree
// 4. repeat the process

export function calculateShouldUpdatedArea(domMatrix: Matrix2D, component: Component) {
}
