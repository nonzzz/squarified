import { Schedule } from '../etoile'
import type { DOMEventDefinition } from '../etoile/native/dom'
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

interface HighlightMeta {
  highlight: Highlight | null
}

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
  onDOMEventTriggered(name, event, module) {
    if (name === 'mousemove') {
      //
    }
  },
  meta: {
    highlight: null
  }
})
