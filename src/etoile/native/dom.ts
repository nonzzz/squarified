import { raf } from '../../shared'
import { Event } from './event'
import type { BindThisParameter } from './event'

// primitive types
export const DOM_EVENTS = ['click', 'mousedown', 'mousemove', 'mouseup', 'mouseover', 'mouseout', 'wheel'] as const

export type DOMEventType = typeof DOM_EVENTS[number]

export interface DOMLoc {
  x: number
  y: number
}
export interface DOMEventMetadata<T extends keyof HTMLElementEventMap = any> {
  native: HTMLElementEventMap[T]
  loc: DOMLoc
}

export type DOMEventCallback<T extends DOMEventType> = (metadata: DOMEventMetadata<T>) => void

export type DOMEventDefinition<API = unknown> = {
  [K in DOMEventType]: BindThisParameter<DOMEventCallback<K>, API>
}

export function getOffset(el: HTMLElement) {
  let e = 0
  let f = 0
  if (document.documentElement.getBoundingClientRect && el.getBoundingClientRect) {
    const { top, left } = el.getBoundingClientRect()
    e = top
    f = left
  } else {
    for (let elt: HTMLElement | null = el; elt; elt = el.offsetParent as HTMLElement | null) {
      e += el.offsetLeft
      f += el.offsetTop
    }
  }

  return [
    e + Math.max(document.documentElement.scrollLeft, document.body.scrollLeft),
    f + Math.max(document.documentElement.scrollTop, document.body.scrollTop)
  ]
}

export function captureBoxXY(c: HTMLElement, evt: unknown, a: number, d: number, translateX: number, translateY: number) {
  const boundingClientRect = c.getBoundingClientRect()
  if (evt instanceof MouseEvent) {
    const [e, f] = getOffset(c)
    return {
      x: ((evt.clientX - boundingClientRect.left - e - translateX) / a),
      y: ((evt.clientY - boundingClientRect.top - f - translateY) / d)
    }
  }
  return { x: 0, y: 0 }
}

export interface EffectScopeContext {
  animationFrameID: number | null
}

function createEffectRun(c: EffectScopeContext) {
  return (fn: () => boolean | void) => {
    const effect = () => {
      const done = fn()
      if (!done) {
        c.animationFrameID = raf(effect)
      }
    }
    if (!c.animationFrameID) {
      c.animationFrameID = raf(effect)
    }
  }
}

function createEffectStop(c: EffectScopeContext) {
  return () => {
    if (c.animationFrameID) {
      window.cancelAnimationFrame(c.animationFrameID)
      c.animationFrameID = null
    }
  }
}

// Fill frame
export function createEffectScope() {
  const c: EffectScopeContext = {
    animationFrameID: null
  }

  const run = createEffectRun(c)
  const stop = createEffectStop(c)

  return { run, stop }
}

export function bindDOMEvent(el: HTMLElement, evt: DOMEventType | (string & {}), bus: Event<DOMEventDefinition<any>>) {
  const handler = (e: unknown) => {
    const { x, y } = captureBoxXY(el, e, 1, 1, 0, 0)
    // @ts-expect-error
    bus.emit(evt, { native: e, loc: { x, y } })
  }
  el.addEventListener(evt, handler)
  return handler
}

export class DOMEvent<API = unknown> extends Event<DOMEventDefinition<API>> {
  el: HTMLElement | null
  events: Array<ReturnType<typeof bindDOMEvent>>
  constructor(el: HTMLElement) {
    super()
    this.el = el
    this.events = DOM_EVENTS.map(evt => bindDOMEvent(this.el!, evt, this))
  }
}
