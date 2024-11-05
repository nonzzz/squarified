// etoile is a simple 2D render engine for web and it don't take complex rendering into account.
// So it's no need to implement a complex event algorithm or hit mode.
// If one day etoile need to build as a useful library. Pls rewrite it!

import { Render, Event as _Event, easing, etoile } from '../etoile'
import type { BindThisParameter } from '../etoile'
import { applyForOpacity } from './animation'
import { TreemapLayout, resetLayout } from './component'
import type { App, TreemapInstanceAPI } from './component'
import { RegisterModule } from './registry'
import type { InheritedCollections } from './registry'
import type { LayoutModule } from './squarify'
import { findRelativeNode, findRelativeNodeById, visit } from './struct'
import type { NativeModule } from './struct'

const primitiveEvents = ['click', 'mousedown', 'mousemove', 'mouseup', 'mouseover', 'mouseout'] as const

export type PrimitiveEvent = typeof primitiveEvents[number]

export interface PrimitiveEventMetadata<T extends keyof HTMLElementEventMap> {
  native: HTMLElementEventMap[T]
  module: LayoutModule
}

export type PrimitiveEventCallback<T extends PrimitiveEvent> = (metadata: PrimitiveEventMetadata<T>) => void

type SelfEventCallback<T extends PrimitiveEvent | 'wheel'> = (metadata: PrimitiveEventMetadata<T>) => void

export type PrimitiveEventDefinition = {
  [key in PrimitiveEvent]: BindThisParameter<PrimitiveEventCallback<key>, TreemapInstanceAPI>
}

type SelfEventDefinition = PrimitiveEventDefinition & {
  wheel: BindThisParameter<SelfEventCallback<'wheel'>, TreemapInstanceAPI>
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

interface SelfEventContenxt {
  treemap: TreemapLayout
  // eslint-disable-next-line no-use-before-define
  self: SelfEvent
}

function smoothDrawing(c: SelfEventContenxt) {
  const { self, treemap } = c

  const currentNode = self.currentNode
  if (currentNode) {
    const lloc: Set<string> = new Set()
    visit([currentNode], (node) => {
      const [x, y, w, h] = node.layout
      const { rectGap, titleHeight } = node.decorator
      lloc.add(x + '-' + y)
      lloc.add(x + '-' + (y + h - rectGap))
      lloc.add(x + '-' + (y + titleHeight))
      lloc.add(x + w - rectGap + '-' + (y + titleHeight))
    })
    const startTime = Date.now()
    const animationDuration = 300
    const draw = () => {
      if (self.forceDestroy) {
        return
      }
      const elapsed = Date.now() - startTime
      const progress = Math.min(elapsed / animationDuration, 1)
      const easedProgress = easing.cubicIn(progress) || 0.1
      let allTasksCompleted = true
      treemap.reset()
      etoile.traverse([treemap.elements[0]], (graph) => {
        const key = `${graph.x}-${graph.y}`
        if (lloc.has(key)) {
          applyForOpacity(graph, 1, 0.7, easedProgress)
          if (progress < 1) {
            allTasksCompleted = false
          }
        }
      })
      treemap.update()
      if (!allTasksCompleted) {
        window.requestAnimationFrame(draw)
      }
    }
    if (!self.isAnimating) {
      self.isAnimating = true
      window.requestAnimationFrame(draw)
    }
  } else {
    treemap.reset()
    treemap.update()
  }
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
      x: ((evt.clientX - boundingClientRect.left - e) / a),
      y: ((evt.clientY - boundingClientRect.top - f) / d)
    }
  }
  return { x: 0, y: 0 }
}

function bindPrimitiveEvent(
  ctx: SelfEventContenxt,
  evt: PrimitiveEvent | (string & {}),
  bus: _Event<SelfEventDefinition>
) {
  const { treemap, self } = ctx
  const c = treemap.render.canvas
  const handler = (e: unknown) => {
    console.log(self.scaleRatio)
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

export class SelfEvent extends RegisterModule {
  currentNode: LayoutModule | null
  isAnimating: boolean
  forceDestroy: boolean
  scaleRatio: number
  constructor() {
    super()
    this.currentNode = null
    this.isAnimating = false
    this.forceDestroy = false
    this.scaleRatio = 1
  }

  onmousemove(this: SelfEventContenxt, metadata: PrimitiveEventMetadata<'mousemove'>) {
    const { module: node } = metadata
    this.self.forceDestroy = false
    if (this.self.currentNode !== node) {
      this.self.currentNode = node
      this.self.isAnimating = false
    }
    smoothDrawing(this)
  }

  onmouseout(this: SelfEventContenxt) {
    this.self.currentNode = null
    this.self.forceDestroy = true
    smoothDrawing(this)
  }

  // onmousewheel(this: SelfEventContenxt, metadata: PrimitiveEventMetadata<'wheel'>) {
  //   const { self, treemap } = this
  //   // @ts-expect-error
  //   const wheelDelta = metadata.native.wheelDelta
  //   const absWheelDelta = Math.abs(wheelDelta)
  //   const originX = metadata.native.offsetX
  //   const originY = metadata.native.offsetY
  //   if (wheelDelta === 0) {
  //     return
  //   }
  //   const factor = absWheelDelta > 3 ? 1.4 : absWheelDelta > 1 ? 1.2 : 1.1
  //   const scale = wheelDelta > 0 ? factor : 1 / factor
  // }

  init(app: App, treemap: TreemapLayout, render: Render): void {
    const event = new _Event<SelfEventDefinition>()
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
    this.scaleRatio = treemap.render.options.devicePixelRatio
    const selfEvents = [...primitiveEvents, 'wheel'] as const

    selfEvents.forEach((evt) => {
      nativeEvents.push(bindPrimitiveEvent({ treemap, self: this }, evt, event))
    })
    const selfEvt = event.bindWithContext<SelfEventContenxt>({ treemap, self: this })
    // selfEvt('wheel', this.onmousewheel)
    selfEvt('mousemove', this.onmousemove)
    selfEvt('mouseout', this.onmouseout)

    treemap.event.on('zoom', (node: LayoutModule) => {
      const root: LayoutModule | null = null
      onZoom({ treemap, self: this }, node, root)
    })
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

function onZoom(ctx: SelfEventContenxt, node: LayoutModule, root: LayoutModule | null) {
  const { treemap, self } = ctx
  const c = treemap.render.canvas
  const boundingClientRect = c.getBoundingClientRect()
  const [w, h] = estimateZoomingArea(node, root, boundingClientRect.width, boundingClientRect.height)
  resetLayout(treemap, w, h)
  treemap.reset()
  const module = findRelativeNodeById(node.node.id, treemap.layoutNodes)
  if (module) {
    const [mx, my, mw, mh] = module.layout
    const scale = Math.min(boundingClientRect.width / mw, boundingClientRect.height / mh)
    const translateX = (boundingClientRect.width / 2) - (mx + mw / 2) * scale
    const translateY = (boundingClientRect.height / 2) - (my + mh / 2) * scale
    etoile.traverse(treemap.elements, (graph) => {
      graph.x = graph.x * scale + translateX
      graph.y = graph.y * scale + translateY
      graph.scaleX = graph.scaleX * scale
      graph.scaleY = graph.scaleY * scale
    })
    self.scaleRatio = scale
    treemap.update()
  }
  root = node
}
