// etoile is a simple 2D render engine for web and it don't take complex rendering into account.
// So it's no need to implement a complex event algorithm or hit mode.
// If one day etoile need to build as a useful library. Pls rewrite it!

import { Render, Event as _Event } from '../etoile'
import type { BindThisParameter } from '../etoile'
import { TreemapLayout } from './component'
import type { App, TreemapInstanceAPI } from './component'
import { RegisterModule } from './registry'
import type { InheritedCollections } from './registry'
import type { LayoutModule } from './squarify'
import { findRelativeNode } from './struct'

const primitiveEvents = ['click', 'mousedown', 'mousemove', 'mouseup', 'mouseover', 'mouseout'] as const

export type PrimitiveEvent = typeof primitiveEvents[number]

export interface PrimitiveEventMetadata<T extends keyof HTMLElementEventMap> {
  native: HTMLElementEventMap[T]
  module: LayoutModule
}

export type PrimitiveEventCallback<T extends PrimitiveEvent> = (metadata: PrimitiveEventMetadata<T>) => void

export type PrimitiveEventDefinition = {
  [key in PrimitiveEvent]: BindThisParameter<PrimitiveEventCallback<key>, TreemapInstanceAPI>
}

function getOffset(el: HTMLElement) {
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

function captureBoxXY(c: HTMLCanvasElement, evt: unknown, a: number, d: number) {
  const boundingClientRect = c.getBoundingClientRect()
  if (evt instanceof MouseEvent) {
    const [e, f] = getOffset(c)
    return {
      x: (evt.clientX - boundingClientRect.left - e) / a,
      y: (evt.clientY - boundingClientRect.top - f) / d
    }
  }
  return { x: 0, y: 0 }
}

function bindPrimitiveEvent(treemap: TreemapLayout, render: Render, evt: PrimitiveEvent, bus: _Event<PrimitiveEventDefinition>) {
  const c = render.canvas
  const handler = (e: unknown) => {
    const { x, y } = captureBoxXY(
      c,
      e,
      treemap.matrix.a,
      treemap.matrix.d
    )
    const event = <PrimitiveEventMetadata<PrimitiveEvent>> {
      native: e,
      module: findRelativeNode(c, { x, y }, treemap.layoutNodes)
    }
    // @ts-expect-error
    bus.emit(evt, event)
  }
  c.addEventListener(evt, handler)
  return handler
}

export interface EventMethods<C = TreemapInstanceAPI, D = PrimitiveEventDefinition> {
  on<Evt extends keyof D>(
    evt: Evt,
    handler: BindThisParameter<D[Evt], unknown extends C ? this : C>
  ): void
  off<Evt extends keyof D>(
    evt: keyof D,
    handler?: BindThisParameter<D[Evt], unknown extends C ? this : C>
  ): void
}

export class SelfEvent extends RegisterModule {
  init(app: App, treemap: TreemapLayout, render: Render): void {
    const event = new _Event<PrimitiveEventDefinition>()
    const nativeEvents: any[] = []
    const methods: InheritedCollections[] = [
      {
        name: 'on',
        fn: () => event.bindWithContext(treemap.api).bind(event)
      },
      {
        name: 'off',
        fn: () => event.off.bind(event)
      },
      {
        name: 'emit',
        fn: () => event.emit.bind(event)
      }
    ]
    RegisterModule.mixin(app, methods)

    primitiveEvents.forEach((evt) => {
      nativeEvents.push(bindPrimitiveEvent(treemap, render, evt, event))
    })
  }
}

function estimateZoomingArea(node: LayoutModule) {
  //
}

export function onZoom(treemap: TreemapLayout, render: Render) {
  const c = render.canvas
  return (node: LayoutModule) => {
    const boundingClientRect = c.getBoundingClientRect()
    estimateZoomingArea(node)
  }
}
