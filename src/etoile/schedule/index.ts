import { Box } from '../graph'
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

    Object.assign(renderOptions, this.to.getBoundingClientRect(), { devicePixelRatio: window.devicePixelRatio || 1 })

    this.render = new Render(renderOptions as RenderViewportOptions)
  }

  update() {
    this.render.update(this)
  }

  // serialize all graph elements
  serialize() {
    // todo
  }
}
