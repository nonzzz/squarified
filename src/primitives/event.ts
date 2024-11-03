// etoile is a simple 2D render engine for web and it don't take complex rendering into account.
// So it's no need to implement a complex event algorithm or hit mode.
// If one day etoile need to build as a useful library. Pls rewrite it!

import { Render, Event as _Event, easing, etoile } from '../etoile'
import type { BindThisParameter } from '../etoile'
import type { AnimationContext } from './animation'
import { TreemapLayout } from './component'
import type { App, TreemapInstanceAPI } from './component'
import { RegisterModule } from './registry'
import type { InheritedCollections } from './registry'
import { type LayoutModule, squarify } from './squarify'
import { findRelativeNode, findRelativeNodeById, visit } from './struct'
import type { NativeModule } from './struct'

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

interface SelfEventContenxt {
  treemap: TreemapLayout
  // eslint-disable-next-line no-use-before-define
  self: SelfEvent
}

function smoothDrawing(c: SelfEventContenxt) {
  const { self, treemap } = c
  treemap.reset()
  if (self.currentNode) {
    const bbox: Set<string> = new Set()
    const tasks: Array<() => AnimationContext> = []
    visit([self.currentNode], (node) => {
      const [x, y, w, h] = node.layout
      const { rectGap, titleHeight } = node.decorator
      bbox.add(x + '-' + y)
      bbox.add(x + '-' + (y + h - rectGap))
      bbox.add(x + '-' + (y + titleHeight))
      bbox.add(x + w - rectGap + '-' + (y + titleHeight))
    })
    etoile.traverse([treemap.elements[0]], (graph) => {
      const key = graph.x + '-' + graph.y
      if (bbox.has(key)) {
        graph.style.opacity = 0.5
        // const fn = treemap.animate(graph).effect('opacity', 0.1).when({ time: 300, easing: easing.cubicIn })
        // tasks.push(() => fn)
      }
    })
  }
  treemap.update()
}

export class SelfEvent extends RegisterModule {
  currentNode: LayoutModule | null = null
  constructor() {
    super()
    this.currentNode = null
  }

  onmousemove(this: SelfEventContenxt, metadata: PrimitiveEventMetadata<'mousemove'>) {
    const { module: node } = metadata
    if (this.self.currentNode !== node) {
      this.self.currentNode = node
    }
    smoothDrawing(this)
  }

  onmouseout(this: SelfEventContenxt) {
    this.self.currentNode = null
    smoothDrawing(this)
  }

  init(app: App, treemap: TreemapLayout, render: Render): void {
    const event = new _Event<PrimitiveEventDefinition>()
    const nativeEvents: Array<ReturnType<typeof bindPrimitiveEvent>> = []
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
    const selfEvt = event.bindWithContext<SelfEventContenxt>({ treemap, self: this })
    selfEvt('mousemove', this.onmousemove)
    selfEvt('mouseout', this.onmouseout)
  }
}

function estimateZoomingArea(node: LayoutModule, root: LayoutModule | null, w: number, h: number) {
  let currentNode = node.node
  const defaultSizes = [w, h, 1]
  if (root === node) {
    return defaultSizes
  }
  let parent: NativeModule
  const viewArea = w * h
  let area = viewArea * 1.5
  // eslint-disable-next-line no-cond-assign
  while (parent = currentNode.parent as NativeModule) {
    let sum = 0
    const siblings = parent.groups
    for (let i = 0; i < siblings.length; i++) {
      sum += siblings[i].weight
    }
    const currentNodeValue = currentNode.weight
    area *= sum / currentNodeValue
    currentNode = parent
  }

  area < viewArea && (area = viewArea)
  const scale = Math.pow(area / viewArea, 0.5)
  return [w * scale, h * scale]
}

export function onZoom(treemap: TreemapLayout, render: Render) {
  const c = render.canvas
  let root: LayoutModule | null = null
  return (node: LayoutModule) => {
    const boundingClientRect = c.getBoundingClientRect()
    // console.log(treemap.matrix)
    const [w, h] = estimateZoomingArea(node, root, boundingClientRect.width, boundingClientRect.height)
    treemap.layoutNodes = squarify(treemap.data, { w, h, x: 0, y: 0 }, treemap.decorator.layout)
    const module = findRelativeNodeById(node.node.id, treemap.layoutNodes)
    console.log(module)
    // console.log(node.node.id)
    // if (module) {
    //   const scale = Math.min(boundingClientRect.width / module.layout[2], boundingClientRect.height / module.layout[3])
    //   const translateX = (boundingClientRect.width / 2) - (module.layout[0] + module.layout[2] / 2) * scale
    //   const translateY = (boundingClientRect.height / 2) - (module.layout[1] + module.layout[3] / 2) * scale
    //   treemap.matrix = treemap.matrix.create({ a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 })
    //   treemap.matrix.transform(300, 300, 1.5, 1.5, 0, 0, 0)
    //   console.log(treemap.matrix)
    //   treemap.draw()
    // }

    root = node
  }
}
