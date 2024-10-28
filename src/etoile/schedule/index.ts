import { Box } from '../graph'
import { Display, Graph } from '../graph/display'
import { log } from '../native/log'
import { Render } from './render'

import type { RenderViewportOptions } from './render'

export type ApplyTo = string | Element

export class Schedule extends Box {
  private render: Render
  to: Element
  constructor(to: ApplyTo, renderOptions: Partial<RenderViewportOptions> = {}) {
    super()
    this.to = typeof to === 'string' ? document.querySelector(to)! : to
    if (!this.to) {
      throw new Error(log.error('The element to bind is not found.'))
    }
    const { width, height } = this.to.getBoundingClientRect()
    Object.assign(renderOptions, { width, height }, { devicePixelRatio: window.devicePixelRatio || 1 })

    this.render = new Render(this.to, renderOptions as RenderViewportOptions)
  }

  update() {
    this.render.update(this)
  }

  // execute all graph elements
  execute(ctx: CanvasRenderingContext2D, graph: Display = this, inBox = this.elements.length > 0) {
    let matrix = graph.matrix
    ctx.setTransform(matrix.a, matrix.b, matrix.c, matrix.d, matrix.e, matrix.f)
    if (inBox && graph instanceof Box) {
      const cap = graph.elements.length
      for (let i = 0; i < cap; i++) {
        const element = graph.elements[i]
        matrix = element.matrix.create({ a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 })
        if (element instanceof Graph) {
          matrix.transform(element.x, element.y, element.scaleX, element.scaleY, element.rotation, element.skewX, element.skewY)
          console.log(matrix)
        }
        this.execute(ctx, element, element instanceof Box && element.elements.length > 0)
      }
    } else {
      if (graph instanceof Box) {
        this.execute(ctx, graph, graph.elements.length > 0)
      }
      if (graph instanceof Graph) {
        graph.render(ctx)
      }
    }
  }
}
