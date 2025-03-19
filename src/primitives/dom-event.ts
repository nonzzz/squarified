import { Component } from '../component'
import { Event as _Event } from '../etoile'
import type { BindThisParameter } from '../etoile'
import { DEFAULT_MATRIX_LOC, Matrix2D } from '../etoile/native/matrix'
import { prettyStrJoin } from '../shared'
import type { LayoutModule } from './squarify'
import { findRelativeNode } from './struct'

export const DOM_EVENTS = ['click', 'mousedown', 'mousemove', 'mouseup', 'mouseover', 'mouseout', 'wheel'] as const

export type DOMEventType = typeof DOM_EVENTS[number]

export interface DOMEventMetadata<T extends keyof HTMLElementEventMap = Any> {
  native: HTMLElementEventMap[T]
}

export type DOMEventCallback<T extends DOMEventType> = (metadata: DOMEventMetadata<T>) => void

export type DOMEVEntDefinition<API = unknown> =
  & {
    [K in DOMEventType]: BindThisParameter<DOMEventCallback<K>, API>
  }
  & { __exposed__: (type: DOMEventType, metadata: DOMEventMetadata<DOMEventType>, node: LayoutModule | null) => void }

function bindDOMEvent(el: HTMLElement, evt: DOMEventType, dom: DOMEvent) {
  const handler = (e: unknown) => {
    dom.emit(evt, { native: e as HTMLElementEventMap[DOMEventType] })
  }
  el.addEventListener(evt, handler)
  return { evt, handler }
}

type DOMEventMethod<T extends DOMEventType> = (metadata: DOMEventMetadata<T>, node: LayoutModule | null) => void

type DOMEventHandlers = {
  [K in DOMEventType as `on${K}`]: DOMEventMethod<K>
}

export const STATE_TRANSITION = {
  IDLE: 'IDLE',
  DRAGGING: 'DRAGGING',
  ZOOMING: 'ZOOMING'
} as const

export type StateTransition = typeof STATE_TRANSITION[keyof typeof STATE_TRANSITION]

const STATE_TRANSITIONS = {
  IDLE: ['DRAGGING', 'ZOOMING'],
  DRAGGING: ['IDLE'],
  ZOOMING: ['IDLE']
}

export class StateManager {
  current: StateTransition
  constructor() {
    this.current = STATE_TRANSITION.IDLE
  }
  canTransition(state: StateTransition) {
    return STATE_TRANSITIONS[this.current].includes(state)
  }
  transition(state: StateTransition): boolean {
    if (this.canTransition(state)) {
      this.current = state
      return true
    }
    return false
  }
  reset() {
    this.current = STATE_TRANSITION.IDLE
  }
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

export class DOMEvent extends _Event<DOMEVEntDefinition> implements DOMEventHandlers {
  el: HTMLElement | null
  domEvents: Array<ReturnType<typeof bindDOMEvent>>
  private component: Component
  stateManager: StateManager
  currentModule: LayoutModule | null
  matrix: Matrix2D
  constructor(component: Component) {
    super()
    this.component = component
    this.stateManager = new StateManager()
    this.el = component.render.canvas
    this.domEvents = DOM_EVENTS.map((evt) => bindDOMEvent(this.el!, evt, this))
    this.stateManager = new StateManager()
    this.currentModule = null
    this.matrix = new Matrix2D()

    DOM_EVENTS.forEach((evt) => {
      this.on(evt, (e: DOMEventMetadata<DOMEventType>) => {
        this.dispatch(evt, e)
      })
    })
  }

  destory() {
    if (this.el) {
      this.domEvents.forEach(({ evt, handler }) => this.el?.removeEventListener(evt, handler))
      this.domEvents = []
      for (const evt in this.eventCollections) {
        this.off(evt as DOMEventType)
      }
      this.matrix.create(DEFAULT_MATRIX_LOC)
    }
  }

  private dispatch<T extends DOMEventType>(kind: T, e: DOMEventMetadata<T>) {
    const node = findRelativeNode(
      captureBoxXY(this.el!, e.native, this.matrix.a, this.matrix.d, this.matrix.e, this.matrix.f),
      this.component.layoutNodes
    )
    const method = this[prettyStrJoin('on', kind)] as ((metadata: DOMEventMetadata<T>, node: LayoutModule | null) => void) | undefined
    if (typeof method === 'function') {
      method.call(this, e, node)
    }
    this.emit('__exposed__', kind, e, node)
  }
  onclick() {}
  onmouseover() {}
  onmousedown(metadata: DOMEventMetadata<'mousedown'>, node: LayoutModule | null) {
    if (isScrollWheelOrRightButtonOnMouseupAndDown(metadata.native)) {
      return
    }
    if (!this.stateManager.canTransition('DRAGGING')) {
      return
    }
    this.stateManager.transition('DRAGGING')
    console.log(node)
  }
  onmousemove(metadata: DOMEventMetadata<'mousemove'>, node: LayoutModule | null) {
    //
  }
  onmouseup(metadata: DOMEventMetadata<'mouseup'>, node: LayoutModule | null) {
    //
  }
  onmouseout(metadata: DOMEventMetadata<'mouseout'>, node: LayoutModule | null) {
    //
  }
  onwheel(metadata: DOMEventMetadata<'wheel'>, node: LayoutModule | null) {
    //
  }
}

interface DuckE {
  which: number
}

function isScrollWheelOrRightButtonOnMouseupAndDown<E extends DuckE = DuckE>(e: E) {
  return e.which === 2 || e.which === 3
}
