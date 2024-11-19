import { applyCanvasTransform } from '../../shared'
import { Box, asserts } from '../graph'
import { Display } from '../graph/display'
import { Event } from '../native/event'
import { log } from '../native/log'
import { Render } from './render'

import type { RenderViewportOptions } from './render'

export type ApplyTo = string | Element

export class Schedule extends Box {
  render: Render
  to: Element
  event: Event
  constructor(to: ApplyTo, renderOptions: Partial<RenderViewportOptions> = {}) {
    super()
    this.to = typeof to === 'string' ? document.querySelector(to)! : to
    if (!this.to) {
      throw new Error(log.error('The element to bind is not found.'))
    }
    const { width, height } = this.to.getBoundingClientRect()
    Object.assign(renderOptions, { width, height }, { devicePixelRatio: window.devicePixelRatio || 1 })
    this.event = new Event()
    this.render = new Render(this.to, renderOptions as RenderViewportOptions)
  }

  update() {
    this.render.update(this)
    const matrix = this.matrix.create({ a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 })
    applyCanvasTransform(this.render.ctx, matrix, this.render.options.devicePixelRatio)
  }

  // execute all graph elements
  execute(render: Render, graph: Display = this) {
    render.ctx.save()
    if (asserts.isLayer(graph) && graph.__refresh__) {
      graph.draw(render.ctx)
    } else {
      if (asserts.isBox(graph) || asserts.isLayer(graph)) {
        const elements = graph.elements
        const cap = elements.length
        for (let i = 0; i < cap; i++) {
          const element = elements[i]
          this.execute(render, element)
        }
        if (asserts.isLayer(graph)) {
          graph.setCacheSnapshot(render.canvas)
        }
      }

      if (asserts.isGraph(graph)) {
        const matrix = graph.matrix.create({ a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 })
        matrix.transform(graph.x, graph.y, graph.scaleX, graph.scaleY, graph.rotation, graph.skewX, graph.skewY)
        applyCanvasTransform(this.render.ctx, matrix, this.render.options.devicePixelRatio)
        graph.render(render.ctx)
      }
    }
    render.ctx.restore()
  }
}
