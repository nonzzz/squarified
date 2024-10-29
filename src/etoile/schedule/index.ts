import { Box } from '../graph'
import { Display, Graph } from '../graph/display'
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
  }

  // execute all graph elements
  execute(render: Render, graph: Display = this) {
    let matrix = graph.matrix
    const pixel = render.options.devicePixelRatio
    render.ctx.setTransform(
      matrix.a * pixel,
      matrix.b * pixel,
      matrix.c * pixel,
      matrix.d * pixel,
      matrix.e * pixel,
      matrix.f * pixel
    )
    if (graph instanceof Box) {
      const cap = graph.elements.length
      for (let i = 0; i < cap; i++) {
        const element = graph.elements[i]
        matrix = element.matrix.create({ a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 })
        if (element instanceof Graph) {
          matrix.transform(element.x, element.y, element.scaleX, element.scaleY, element.rotation, element.skewX, element.skewY)
        }
        this.execute(render, element)
      }
    }
    if (graph instanceof Graph) {
      graph.render(render.ctx)
    }
  }
}
