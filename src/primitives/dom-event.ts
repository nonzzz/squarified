import { Component } from '../component'
import { Event as _Event } from '../etoile'
import type { BindThisParameter } from '../etoile'
import { prettyStrJoin } from '../shared'

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
  & { __exposed__: (type: DOMEventType, metadata: DOMEventMetadata<DOMEventType>) => void }

function bindDOMEvent(el: HTMLElement, evt: DOMEventType, dom: DOMEvent) {
  const handler = (e: unknown) => {
    dom.emit(evt, { native: e as HTMLElementEventMap[DOMEventType] })
  }
  el.addEventListener(evt, handler)
  return { evt, handler }
}

type DOMEventMethod<T extends DOMEventType> = (metadata: DOMEventMetadata<T>) => void

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

export class DOMEvent extends _Event<DOMEVEntDefinition> implements DOMEventHandlers {
  el: HTMLElement | null
  domEvents: Array<ReturnType<typeof bindDOMEvent>>
  private component: Component
  private stateManager: StateManager
  constructor(component: Component) {
    super()
    this.component = component
    this.stateManager = new StateManager()
    this.el = component.render.canvas
    this.domEvents = DOM_EVENTS.map((evt) => bindDOMEvent(this.el!, evt, this))
    this.stateManager = new StateManager()

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
    }
  }

  private dispatch<T extends DOMEventType>(kind: T, e: DOMEventMetadata<T>) {
    const method = this[prettyStrJoin('on', kind)] as ((metadata: DOMEventMetadata<T>) => void) | undefined
    if (typeof method === 'function') {
      method.call(this, e)
    }
    this.emit('__exposed__', kind, e)
  }
  onclick() {}
  onmouseover() {}
  onmousedown(metadata: DOMEventMetadata<'mousedown'>) {
    //
  }
  onmousemove(metadata: DOMEventMetadata<'mousemove'>) {
    //
  }
  onmouseup(metadata: DOMEventMetadata<'mouseup'>) {
    //
  }
  onmouseout(metadata: DOMEventMetadata<'mouseout'>) {
    //
  }
  onwheel(metadata: DOMEventMetadata<'wheel'>) {
    //
  }
}
