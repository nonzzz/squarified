import { easing } from '../etoile'
import { DEFAULT_MATRIX_LOC } from '../etoile/native/matrix'
import { smoothFrame, stackMatrixTransformWithGraphAndLayer } from '../shared'
import { mixinWithParams } from '../shared'
import { definePlugin } from '../shared/plugin-driver'
import { getDragOptions, getHighlightInstance } from './drag'
import { ANIMATION_DURATION } from './highlight'
import { getScaleOptions } from './wheel'

interface ZoomableMetadata {
  isZooming: boolean
  previousMatrixState?: {
    e: number,
    f: number,
    a: number,
    d: number
  }
}

const MAX_SCALE_MULTIPLIER = 2.0

export const presetZoomablePlugin = definePlugin({
  name: 'treemap:preset-zoomable',
  onLoad(treemap, { stateManager: state, matrix }) {
    return mixinWithParams(treemap, [
      {
        name: 'zoom',
        fn: () => (id: string) => {
          const meta = this.getPluginMetadata<ZoomableMetadata>('treemap:preset-zoomable')
          if (!meta || state.isInState('ZOOMING')) { return }

          const targetModule = this.resolveModuleById(id)

          if (!targetModule) { return }

          meta.previousMatrixState = {
            e: matrix.e,
            f: matrix.f,
            a: matrix.a,
            d: matrix.d
          }

          const component = this.instance

          state.transition('ZOOMING')

          const [nodeX, nodeY, nodeW, nodeH] = targetModule.layout
          const { width, height } = component.render.options

          const currentScale = matrix.a
          const scaleX = width / nodeW
          const scaleY = height / nodeH
          const fullScale = Math.min(scaleX, scaleY) * 0.9

          const targetScale = Math.min(fullScale, currentScale * MAX_SCALE_MULTIPLIER)

          const scale = targetScale

          const nodeCenterX = nodeX + nodeW / 2
          const nodeCenterY = nodeY + nodeH / 2
          const viewCenterX = width / 2
          const viewCenterY = height / 2

          const targetE = viewCenterX - nodeCenterX * scale
          const targetF = viewCenterY - nodeCenterY * scale

          const scaleMeta = getScaleOptions.call(this)
          if (scaleMeta) {
            scaleMeta.scaleOptions.scale = scale
          }

          const highlight = getHighlightInstance.call(this)

          const dragMeta = getDragOptions.call(this)

          if (dragMeta) {
            dragMeta.dragOptions.x = 0
            dragMeta.dragOptions.y = 0
            dragMeta.dragOptions.lastX = 0
            dragMeta.dragOptions.lastY = 0
          }

          const startMatrix = {
            e: matrix.e,
            f: matrix.f,
            a: matrix.a,
            d: matrix.d
          }

          smoothFrame((progress) => {
            const easedProgress = easing.cubicInOut(progress)
            const currentE = startMatrix.e + (targetE - startMatrix.e) * easedProgress
            const currentF = startMatrix.f + (targetF - startMatrix.f) * easedProgress
            const currentA = startMatrix.a + (scale - startMatrix.a) * easedProgress
            const currentD = startMatrix.d + (scale - startMatrix.d) * easedProgress

            matrix.create(DEFAULT_MATRIX_LOC)
            matrix.e = currentE
            matrix.f = currentF
            matrix.a = currentA
            matrix.d = currentD

            if (highlight?.highlight) {
              highlight.highlight.reset()
              highlight.highlight.setZIndexForHighlight()
            }

            component.cleanup()

            const { width, height } = component.render.options

            component.layoutNodes = component.calculateLayoutNodes(component.data, { w: width, h: height, x: 0, y: 0 }, matrix.a)

            component.draw(true, false)
            stackMatrixTransformWithGraphAndLayer(
              component.elements,
              matrix.e,
              matrix.f,
              matrix.a
            )
            component.update()
          }, {
            duration: ANIMATION_DURATION,
            onStop: () => {
              state.reset()
            }
          })
        }
      }
    ])
  },
  meta: {
    isZooming: false
  } as ZoomableMetadata
})
