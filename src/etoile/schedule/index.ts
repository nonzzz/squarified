import { applyCanvasTransform } from '../../shared'
import { Box, asserts } from '../graph'
import { Display } from '../graph/display'
import { Event } from '../native/event'
import type { DefaultEventDefinition } from '../native/event'
import { log } from '../native/log'
import { Render } from './render'

import type { RenderViewportOptions } from './render'

export type ApplyTo = string | HTMLElement

export interface DrawGraphIntoCanvasOptions {
  c: HTMLCanvasElement
  ctx: CanvasRenderingContext2D
  dpr: number
}

// First cleanup canvas
export function drawGraphIntoCanvas(
  graph: Display,
  opts: DrawGraphIntoCanvasOptions
) {
  const { ctx, dpr } = opts
  ctx.save()
  if (asserts.isBox(graph)) {
    const elements = graph.elements
    const cap = elements.length

    for (let i = 0; i < cap; i++) {
      const element = elements[i]
      drawGraphIntoCanvas(element, opts)
    }
  }
  if (asserts.isGraph(graph)) {
    const matrix = graph.matrix.create({ a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 })
    matrix.transform(graph.x, graph.y, graph.scaleX, graph.scaleY, graph.rotation, graph.skewX, graph.skewY)
    if (asserts.isRoundRect(graph)) {
      const effectiveWidth = graph.width - graph.style.padding * 2
      const effectiveHeight = graph.height - graph.style.padding * 2
      if (effectiveWidth <= 0 || effectiveHeight <= 0) {
        ctx.restore()
        return
      }
      if (graph.style.radius >= effectiveHeight / 2 || graph.style.radius >= effectiveWidth / 2) {
        ctx.restore()
        return
      }
    }
    applyCanvasTransform(ctx, matrix, dpr)
    graph.render(ctx)
  }
  ctx.restore()
}

export class Schedule<D extends DefaultEventDefinition = DefaultEventDefinition> extends Box {
  render: Render
  to: HTMLElement
  event: Event<D>
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
    this.render.clear(this.render.options.width, this.render.options.height)
    this.execute(this.render, this)
    const matrix = this.matrix.create({ a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 })
    applyCanvasTransform(this.render.ctx, matrix, this.render.options.devicePixelRatio)
  }

  // execute all graph elements
  execute(render: Render, graph: Display = this) {
    drawGraphIntoCanvas(graph, { c: render.canvas, ctx: render.ctx, dpr: render.options.devicePixelRatio })
  }
}
