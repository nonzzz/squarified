import { Schedule } from '../etoile'
import { S } from '../etoile/graph/display'
import type { DOMEventDefinition } from '../etoile/native/dom'
import { createSmoothFrame } from '../etoile/native/dom'
import type { ColorDecoratorResultRGB } from '../etoile/native/runtime'
import { createRoundBlock } from '../shared'
import { definePlugin } from '../shared/plugin-driver'

export class Highlight extends Schedule<DOMEventDefinition> {
  reset() {
    this.destory()
    this.update()
  }

  get canvas() {
    return this.render.canvas
  }

  setZIndexForHighlight(zIndex = '-1') {
    this.canvas.style.zIndex = zIndex
  }

  init() {
    this.setZIndexForHighlight()
    this.canvas.style.position = 'absolute'
    this.canvas.style.pointerEvents = 'none'
  }
}
interface EffectOptions {
  duration: number
  onStop?: () => void
  deps?: Array<() => boolean>
}

function smoothFrame(callback: (progress: number, cleanup: () => void) => void, opts: EffectOptions) {
  const frame = createSmoothFrame()
  const startTime = Date.now()

  const condtion = (process: number) => {
    if (Array.isArray(opts.deps)) {
      return opts.deps.some((dep) => dep())
    }
    return process >= 1
  }

  frame.run(() => {
    const elapsed = Date.now() - startTime
    const progress = Math.min(elapsed / opts.duration, 1)
    if (condtion(progress)) {
      frame.stop()
      if (opts.onStop) {
        opts.onStop()
      }
      return true
    }
    return callback(progress, frame.stop)
  })
}

interface HighlightMeta {
  highlight: Highlight | null
}

const ANIMATION_DURATION = 300

const HIGH_LIGHT_OPACITY = 0.3

const fill = <ColorDecoratorResultRGB> { desc: { r: 255, g: 255, b: 255 }, mode: 'rgb' }

export const presetHighlightPlugin = definePlugin({
  name: 'treemap:preset-highlight',
  onLoad(treemapContext) {
    const meta = this.getPluginMetadata('treemap:preset-highlight') as HighlightMeta

    if (!meta.highlight) {
      meta.highlight = new Highlight(this.instance.to)
    }
    const _resize = treemapContext.resize
    const _dispose = treemapContext.dispose
    treemapContext.resize = () => {
      _resize()
      if (this.instance) {
        meta.highlight?.render.initOptions({ ...this.instance.render.options })
        meta.highlight?.reset()
        meta.highlight?.init()
      }
    }
    treemapContext.dispose = () => {
      if (this.instance) {
        _dispose()
        if (meta.highlight) {
          meta.highlight.destory()
          meta.highlight = null
        }
      }
    }
  },
  onDOMEventTriggered(name, event, module, { stateManager: state, matrix, component }) {
    if (name === 'mousemove') {
      if (state.canTransition('MOVE')) {
        const meta = this.getPluginMetadata('treemap:preset-highlight') as HighlightMeta
        if (!module) {
          meta.highlight?.reset()
          meta.highlight?.update()
          meta.highlight?.setZIndexForHighlight()
          return
        }
        const [x, y, w, h] = module.layout
        const effectiveRadius = Math.min(component.config.layout?.rectRadius || 4, w / 4, h / 4)
        smoothFrame((_, cleanup) => {
          cleanup()
          meta.highlight?.reset()
          const mask = createRoundBlock(x, y, w, h, { fill, opacity: HIGH_LIGHT_OPACITY, radius: effectiveRadius, padding: 0 })
          meta.highlight?.add(mask)
          meta.highlight?.setZIndexForHighlight('1')
          stackMatrixTransform(mask, matrix.e, matrix.f, 1)
          meta.highlight?.update()
        }, {
          duration: ANIMATION_DURATION
        })
      }
    }
  },
  meta: {
    highlight: null
  }
})

function stackMatrixTransform(graph: S, e: number, f: number, scale: number) {
  graph.x = graph.x * scale + e
  graph.y = graph.y * scale + f
  graph.scaleX = scale
  graph.scaleY = scale
}
