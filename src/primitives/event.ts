// etoile is a simple 2D render engine for web and it don't take complex rendering into account.
// So it's no need to implement a complex event algorithm or hit mode.
// If one day etoile need to build as a useful library. Pls rewrite it!
// All of implementation don't want to consider the compatibility of the browser.

import { createFillBlock } from '../shared'
import { Display } from '../etoile/graph/display'
import { Render, Event as _Event, easing, etoile } from '../etoile'
import type { BindThisParameter } from '../etoile'
import type { ColorDecoratorResultRGB } from '../etoile/native/runtime'
import { applyForOpacity, createEffectScope } from './animation'
import { TreemapLayout, resetLayout } from './component'
import type { App, TreemapInstanceAPI } from './component'
import { RegisterModule } from './registry'
import type { InheritedCollections } from './registry'
import type { LayoutModule } from './squarify'
import { findRelativeNode, findRelativeNodeById } from './struct'
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

interface DraggingState {
  x: number
  y: number
}

const fill = <ColorDecoratorResultRGB> { desc: { r: 255, g: 255, b: 255 }, mode: 'rgb' }

function smoothDrawing(c: SelfEventContenxt) {
  const { self, treemap } = c
  const currentNode = self.currentNode

  if (currentNode) {
    const { run, stop } = createEffectScope()
    const startTime = Date.now()
    const animationDuration = 300
    const [x, y, w, h] = currentNode.layout
    run(() => {
      if (self.forceDestroy) {
        stop()
        return true
      }
      const elapsed = Date.now() - startTime
      const progress = Math.min(elapsed / animationDuration, 1)
      const easedProgress = easing.cubicInOut(progress)
      const mask = createFillBlock(x, y, w, h, { fill, opacity: 0.4 })
      treemap.reset()
      applyForOpacity(mask, 0.4, 0.4, easedProgress)
      // @ts-expect-error
      treemap.bgBox.add(mask)
      applyGraphTransform(treemap.elements, self.translateX, self.translateY, self.scaleRatio)
      treemap.update()
      return progress >= 1
    })
  } else {
    treemap.reset()
    applyGraphTransform(treemap.elements, self.translateX, self.translateY, self.scaleRatio)
    treemap.update()
  }
}

function applyZoomEvent(ctx: SelfEventContenxt) {
  ctx.treemap.event.on('zoom', (node: LayoutModule) => {
    const root: LayoutModule | null = null
    if (ctx.self.isDragging) return
    onZoom(ctx, node, root)
  })
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

function captureBoxXY(c: HTMLCanvasElement, evt: unknown, a: number, d: number, translateX: number, translateY: number) {
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

function bindPrimitiveEvent(
  ctx: SelfEventContenxt,
  evt: PrimitiveEvent | (string & {}),
  bus: _Event<SelfEventDefinition>
) {
  const { treemap, self } = ctx
  const c = treemap.render.canvas
  const handler = (e: unknown) => {
    const { x, y } = captureBoxXY(
      c,
      e,
      self.scaleRatio,
      self.scaleRatio,
      self.translateX,
      self.translateY
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
  translateX: number
  translateY: number
  layoutWidth: number
  layoutHeight: number
  isDragging: boolean
  draggingState: DraggingState
  event: _Event<SelfEventDefinition>
  constructor() {
    super()
    this.currentNode = null
    this.isAnimating = false
    this.forceDestroy = false
    this.isDragging = false
    this.scaleRatio = 1
    this.translateX = 0
    this.translateY = 0
    this.layoutWidth = 0
    this.layoutHeight = 0
    this.draggingState = { x: 0, y: 0 }
    this.event = new _Event<SelfEventDefinition>()
  }

  ondragstart(this: SelfEventContenxt, metadata: PrimitiveEventMetadata<'mousedown'>) {
    const { native } = metadata
    if (isScrollWheelOrRightButtonOnMouseupAndDown(native)) {
      return
    }
    const x = native.offsetX
    const y = native.offsetY
    this.self.isDragging = true
    this.self.draggingState = { x, y }
  }

  ondragmove(this: SelfEventContenxt, metadata: PrimitiveEventMetadata<'mousemove'>) {
    if (!this.self.isDragging) {
      if ('zoom' in this.treemap.event.eventCollections) {
        const condit = this.treemap.event.eventCollections.zoom.length > 0
        if (!condit) {
          applyZoomEvent(this)
        }
      }
      return
    }
    // @ts-expect-error
    this.self.event.off('mousemove', this.self.onmousemove)
    this.treemap.event.off('zoom')
    this.self.forceDestroy = true
    const { native } = metadata
    const x = native.offsetX
    const y = native.offsetY
    const { x: lastX, y: lastY } = this.self.draggingState
    const drawX = x - lastX
    const drawY = y - lastY
    this.self.translateX += drawX
    this.self.translateY += drawY
    this.self.draggingState = { x, y }
    this.treemap.reset()
    applyGraphTransform(this.treemap.elements, this.self.translateX, this.self.translateY, this.self.scaleRatio)
    this.treemap.update()
  }

  ondragend(this: SelfEventContenxt, metadata: PrimitiveEventMetadata<'mousemove'>) {
    if (!this.self.isDragging) {
      return
    }
    this.self.isDragging = false
    this.self.draggingState = { x: 0, y: 0 }
    this.self.event.bindWithContext(this)('mousemove', this.self.onmousemove)
  }

  onmousemove(this: SelfEventContenxt, metadata: PrimitiveEventMetadata<'mousemove'>) {
    const { self } = this
    if (self.isDragging) {
      return
    }
    const { module: node } = metadata
    self.forceDestroy = false
    if (self.currentNode !== node) {
      self.currentNode = node
      self.isAnimating = false
    }
    smoothDrawing(this)
  }

  onmouseout(this: SelfEventContenxt) {
    const { self } = this
    self.currentNode = null
    self.forceDestroy = true
    self.isDragging = false
    smoothDrawing(this)
  }

  onwheel(this: SelfEventContenxt, metadata: PrimitiveEventMetadata<'wheel'>) {
    const { self, treemap } = this
    // @ts-expect-error
    const wheelDelta = metadata.native.wheelDelta
    const absWheelDelta = Math.abs(wheelDelta)
    const offsetX = metadata.native.offsetX
    const offsetY = metadata.native.offsetY

    if (wheelDelta === 0) {
      return
    }
    self.forceDestroy = true
    self.isAnimating = true
    treemap.reset()
    const factor = absWheelDelta > 3 ? 1.4 : absWheelDelta > 1 ? 1.2 : 1.1
    const delta = wheelDelta > 0 ? factor : 1 / factor

    self.scaleRatio *= delta

    const translateX = offsetX - (offsetX - self.translateX) * delta
    const translateY = offsetY - (offsetY - self.translateY) * delta
    self.translateX = translateX
    self.translateY = translateY
    applyGraphTransform(treemap.elements, self.translateX, self.translateY, self.scaleRatio)

    treemap.update()
    self.forceDestroy = false
    self.isAnimating = false
  }

  init(app: App, treemap: TreemapLayout, render: Render): void {
    const event = this.event
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
    const selfEvents = [...primitiveEvents, 'wheel'] as const
    selfEvents.forEach((evt) => {
      nativeEvents.push(bindPrimitiveEvent({ treemap, self: this }, evt, event))
    })
    const selfEvt = event.bindWithContext<SelfEventContenxt>({ treemap, self: this })
    selfEvt('mousedown', this.ondragstart)
    selfEvt('mousemove', this.ondragmove)
    selfEvt('mouseup', this.ondragend)

    // highlight
    selfEvt('mousemove', this.onmousemove)
    selfEvt('mouseout', this.onmouseout)

    // wheel
    selfEvt('wheel', this.onwheel)

    applyZoomEvent({ treemap, self: this })

    treemap.event.on('cleanup:selfevent', () => {
      this.currentNode = null
      this.isAnimating = false
      this.scaleRatio = 1
      this.translateX = 0
      this.translateY = 0
      this.layoutWidth = treemap.render.canvas.width
      this.layoutHeight = treemap.render.canvas.height
      this.isDragging = false
      this.draggingState = { x: 0, y: 0 }
    })
  }
}

function estimateZoomingArea(node: LayoutModule, root: LayoutModule | null, w: number, h: number) {
  const defaultSizes = [w, h, 1]
  if (root === node) {
    return defaultSizes
  }

  const viewArea = w * h
  let area = viewArea

  let parent: NativeModule | null = node.node.parent as NativeModule
  let totalWeight = node.node.weight

  while (parent) {
    const siblings = parent.groups || []
    let siblingWeightSum = 0

    for (const sibling of siblings) {
      siblingWeightSum += sibling.weight
    }

    area *= siblingWeightSum / totalWeight

    totalWeight = parent.weight
    parent = parent.parent as NativeModule
  }

  const maxScaleFactor = 2.5
  const minScaleFactor = 0.3

  const scaleFactor = Math.max(minScaleFactor, Math.min(maxScaleFactor, Math.sqrt(area / viewArea)))

  return [w * scaleFactor, h * scaleFactor]
}

function applyGraphTransform(graphs: Display[], translateX: number, translateY: number, scale: number) {
  etoile.traverse(graphs, (graph) => {
    graph.x = graph.x * scale + translateX
    graph.y = graph.y * scale + translateY
    graph.scaleX = scale
    graph.scaleY = scale
  })
}

function onZoom(ctx: SelfEventContenxt, node: LayoutModule, root: LayoutModule | null) {
  if (!node) return
  const { treemap, self } = ctx
  const c = treemap.render.canvas
  const boundingClientRect = c.getBoundingClientRect()
  const [w, h] = estimateZoomingArea(node, root, boundingClientRect.width, boundingClientRect.height)
  resetLayout(treemap, w, h)
  const module = findRelativeNodeById(node.node.id, treemap.layoutNodes)
  if (module) {
    const [mx, my, mw, mh] = module.layout
    const scale = Math.min(boundingClientRect.width / mw, boundingClientRect.height / mh)
    const translateX = (boundingClientRect.width / 2) - (mx + mw / 2) * scale
    const translateY = (boundingClientRect.height / 2) - (my + mh / 2) * scale
    const initialScale = self.scaleRatio
    const initialTranslateX = self.translateX
    const initialTranslateY = self.translateY
    const startTime = Date.now()
    const animationDuration = 300
    if (self.layoutHeight !== w || self.layoutHeight !== h) {
      // remove font caches
      delete treemap.fontsCaches[module.node.id]
    }
    const { run, stop } = createEffectScope()
    run(() => {
      const elapsed = Date.now() - startTime
      const progress = Math.min(elapsed / animationDuration, 1)
      if (progress >= 1) {
        stop()
        self.layoutWidth = w
        self.layoutHeight = h
      }
      const easedProgress = easing.cubicInOut(progress)
      const scaleRatio = initialScale + (scale - initialScale) * easedProgress
      self.translateX = initialTranslateX + (translateX - initialTranslateX) * easedProgress
      self.translateY = initialTranslateY + (translateY - initialTranslateY) * easedProgress
      self.scaleRatio = scaleRatio
      treemap.reset()
      applyGraphTransform(treemap.elements, self.translateX, self.translateY, scaleRatio)
      treemap.update()

      return progress >= 1
    })
  }
  root = node
}

interface DuckE {
  which: number
}

// Only works for mouseup and mousedown events
function isScrollWheelOrRightButtonOnMouseupAndDown<E extends DuckE = DuckE>(e: E) {
  return e.which === 2 || e.which === 3
}
