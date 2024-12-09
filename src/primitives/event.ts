// etoile is a simple 2D render engine for web and it don't take complex rendering into account.
// So it's no need to implement a complex event algorithm or hit mode.
// If one day etoile need to build as a useful library. Pls rewrite it!
// All of implementation don't want to consider the compatibility of the browser.

import { Event as _Event, Schedule, asserts, drawGraphIntoCanvas, easing, etoile } from '../etoile'
import type { BindThisParameter } from '../etoile'
import { Display, S } from '../etoile/graph/display'
import type { ColorDecoratorResultRGB } from '../etoile/native/runtime'
import { createFillBlock, mixin } from '../shared'
import type { InheritedCollections } from '../shared'
import { applyForOpacity, createEffectScope } from './animation'
import { TreemapLayout, resetLayout } from './component'
import type { App, TreemapInstanceAPI } from './component'
import { RegisterModule } from './registry'
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

export const internalEventMappings = {
  CLEAN_UP: 'self:cleanup',
  ON_LOAD: 'self:onload',
  ON_ZOOM: 'zoom'
} as const

export type InternalEventType = typeof internalEventMappings[keyof typeof internalEventMappings]

export interface InternalEventMappings {
  [internalEventMappings.CLEAN_UP]: () => void
  [internalEventMappings.ON_LOAD]: (width: number, height: number, root: HTMLElement) => void
  [internalEventMappings.ON_ZOOM]: (node: LayoutModule) => void
}

export type InternalEventDefinition = {
  [key in InternalEventType]: InternalEventMappings[key]
}

const fill = <ColorDecoratorResultRGB> { desc: { r: 255, g: 255, b: 255 }, mode: 'rgb' }

function smoothDrawing(c: SelfEventContenxt) {
  const { self } = c
  const currentNode = self.currentNode
  if (currentNode) {
    const effect = createEffectScope()
    const startTime = Date.now()
    const animationDuration = 300
    const [x, y, w, h] = currentNode.layout
    effect.run(() => {
      const elapsed = Date.now() - startTime
      const progress = Math.min(elapsed / animationDuration, 1)
      if (self.forceDestroy || progress >= 1) {
        effect.stop()
        self.highlight.reset()
        self.highlight.setDisplayLayerForHighlight()
        return true
      }
      const easedProgress = easing.cubicInOut(progress)
      self.highlight.reset()
      const mask = createFillBlock(x, y, w, h, { fill, opacity: 0.4 })
      self.highlight.highlight.add(mask)
      self.highlight.setDisplayLayerForHighlight('1')
      applyForOpacity(mask, 0.4, 0.4, easedProgress)
      stackMatrixTransform(mask, self.translateX, self.translateY, self.scaleRatio)
      self.highlight.highlight.update()
    })
  } else {
    self.highlight.reset()
    self.highlight.setDisplayLayerForHighlight()
  }
}

function applyZoomEvent(ctx: SelfEventContenxt) {
  ctx.treemap.event.on(internalEventMappings.ON_ZOOM, (node: LayoutModule) => {
    const root: LayoutModule | null = null
    if (ctx.self.isDragging) { return }
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
  c: HTMLCanvasElement,
  ctx: SelfEventContenxt,
  evt: PrimitiveEvent | (string & {}),
  bus: _Event<SelfEventDefinition>
) {
  const { treemap, self } = ctx
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
      module: findRelativeNode({ x, y }, treemap.layoutNodes)
    }
    // @ts-expect-error safe
    bus.emit(evt, event)
  }
  c.addEventListener(evt, handler)
  return handler
}
// For best render performance. we should cache avaliable layout nodes.
export class SelfEvent extends RegisterModule {
  currentNode: LayoutModule | null
  forceDestroy: boolean
  scaleRatio: number
  translateX: number
  translateY: number
  layoutWidth: number
  layoutHeight: number
  isDragging: boolean
  draggingState: DraggingState
  event: _Event<SelfEventDefinition>
  triggerZoom: boolean
  // eslint-disable-next-line no-use-before-define
  highlight: HighlightContext
  constructor() {
    super()
    this.currentNode = null
    this.forceDestroy = false
    this.isDragging = false
    this.scaleRatio = 1
    this.translateX = 0
    this.translateY = 0
    this.layoutWidth = 0
    this.layoutHeight = 0
    this.draggingState = { x: 0, y: 0 }
    this.event = new _Event<SelfEventDefinition>()
    this.triggerZoom = false
    this.highlight = createHighlight()
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
    // If highlighting is triggered, it needs to be destroyed first
    this.self.highlight.reset()
    this.self.highlight.setDisplayLayerForHighlight()
    this.self.event.off('mousemove', this.self.onmousemove.bind(this))
    this.treemap.event.off(internalEventMappings.ON_ZOOM)
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
    if (this.self.triggerZoom) {
      refreshBackgroundLayer(this)
    }
    this.treemap.reset()
    stackMatrixTransformWithGraphAndLayer(this.treemap.elements, this.self.translateX, this.self.translateY, this.self.scaleRatio)
    this.treemap.update()
  }

  ondragend(this: SelfEventContenxt) {
    if (!this.self.isDragging) {
      return
    }
    this.self.isDragging = false
    this.self.draggingState = { x: 0, y: 0 }
    this.self.highlight.reset()
    this.self.highlight.setDisplayLayerForHighlight()
    this.self.event.bindWithContext(this)('mousemove', this.self.onmousemove.bind(this))
  }

  onmousemove(this: SelfEventContenxt, metadata: PrimitiveEventMetadata<'mousemove'>) {
    const { self } = this
    const { module: node } = metadata
    self.forceDestroy = false
    if (self.currentNode !== node) {
      self.currentNode = node
    }
    smoothDrawing(this)
  }

  onmouseout(this: SelfEventContenxt) {
    const { self } = this
    self.currentNode = null
    self.forceDestroy = true
    smoothDrawing(this)
  }

  onwheel(this: SelfEventContenxt, metadata: PrimitiveEventMetadata<'wheel'>) {
    const { self, treemap } = this

    // @ts-expect-error safe
    const wheelDelta = metadata.native.wheelDelta as number
    const absWheelDelta = Math.abs(wheelDelta)
    const offsetX = metadata.native.offsetX
    const offsetY = metadata.native.offsetY

    if (wheelDelta === 0) {
      return
    }
    self.forceDestroy = true
    if (self.triggerZoom) {
      refreshBackgroundLayer(this)
    }
    treemap.reset()
    this.self.highlight.reset()
    this.self.highlight.setDisplayLayerForHighlight()
    const factor = absWheelDelta > 3 ? 1.4 : absWheelDelta > 1 ? 1.2 : 1.1
    const delta = wheelDelta > 0 ? factor : 1 / factor
    self.scaleRatio *= delta

    const translateX = offsetX - (offsetX - self.translateX) * delta
    const translateY = offsetY - (offsetY - self.translateY) * delta
    self.translateX = translateX
    self.translateY = translateY
    stackMatrixTransformWithGraphAndLayer(this.treemap.elements, this.self.translateX, this.self.translateY, this.self.scaleRatio)
    treemap.update()
    self.forceDestroy = false
  }

  init(app: App, treemap: TreemapLayout): void {
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
    mixin(app, methods)
    const selfCtx = { treemap, self: this }
    const selfEvents = [...primitiveEvents, 'wheel'] as const
    selfEvents.forEach((evt) => {
      nativeEvents.push(bindPrimitiveEvent(treemap.render.canvas, selfCtx, evt, event))
    })
    const selfEvt = event.bindWithContext<SelfEventContenxt>(selfCtx)
    selfEvt('mousedown', this.ondragstart.bind(selfCtx))
    selfEvt('mousemove', this.ondragmove.bind(selfCtx))
    selfEvt('mouseup', this.ondragend.bind(selfCtx))

    // wheel
    selfEvt('wheel', this.onwheel.bind(selfCtx))

    applyZoomEvent({ treemap, self: this })

    let installHightlightEvent = false

    treemap.event.on(internalEventMappings.ON_LOAD, (width, height, root) => {
      this.highlight.init(width, height, root)

      if (!installHightlightEvent) {
        // highlight
        selfEvt('mousemove', this.onmousemove.bind(selfCtx))
        selfEvt('mouseout', this.onmouseout.bind(selfCtx))
        installHightlightEvent = true
        this.highlight.setDisplayLayerForHighlight()
      }
      this.highlight.reset()
    })

    treemap.event.on(internalEventMappings.CLEAN_UP, () => {
      this.currentNode = null
      this.scaleRatio = 1
      this.translateX = 0
      this.translateY = 0
      this.layoutWidth = treemap.render.canvas.width
      this.layoutHeight = treemap.render.canvas.height
      this.isDragging = false
      this.triggerZoom = false
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
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
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

function stackMatrixTransform(graph: S, e: number, f: number, scale: number) {
  graph.x = graph.x * scale + e
  graph.y = graph.y * scale + f
  graph.scaleX = scale
  graph.scaleY = scale
}

function stackMatrixTransformWithGraphAndLayer(graphs: Display[], e: number, f: number, scale: number) {
  etoile.traverse(graphs, (graph) => stackMatrixTransform(graph, e, f, scale))
}

function onZoom(ctx: SelfEventContenxt, node: LayoutModule, root: LayoutModule | null) {
  if (!node) { return }
  const { treemap, self } = ctx
  self.forceDestroy = true
  const c = treemap.render.canvas
  const boundingClientRect = c.getBoundingClientRect()
  const [w, h] = estimateZoomingArea(node, root, boundingClientRect.width, boundingClientRect.height)
  if (self.layoutHeight !== w || self.layoutHeight !== h) {
    // remove font caches
    delete treemap.fontsCaches[node.node.id]
    delete treemap.ellispsisWidthCache[node.node.id]
  }
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

    const { run, stop } = createEffectScope()
    run(() => {
      const elapsed = Date.now() - startTime
      const progress = Math.min(elapsed / animationDuration, 1)
      treemap.backgroundLayer.__refresh__ = false
      if (progress >= 1) {
        stop()
        self.layoutWidth = w
        self.layoutHeight = h
        self.forceDestroy = false
        self.triggerZoom = true
        return true
      }
      const easedProgress = easing.cubicInOut(progress)
      const scaleRatio = initialScale + (scale - initialScale) * easedProgress
      self.translateX = initialTranslateX + (translateX - initialTranslateX) * easedProgress
      self.translateY = initialTranslateY + (translateY - initialTranslateY) * easedProgress
      self.scaleRatio = scaleRatio
      treemap.reset()
      stackMatrixTransformWithGraphAndLayer(treemap.elements, self.translateX, self.translateY, scaleRatio)
      treemap.update()
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

interface HighlightContext {
  init: (w: number, h: number, root: HTMLElement) => void
  reset: () => void
  setDisplayLayerForHighlight: (layer?: string) => void
  get highlight(): Schedule
}

function createHighlight(): HighlightContext {
  let s: Schedule | null = null

  const setDisplayLayerForHighlight = (layer: string = '-1') => {
    if (!s) { return }
    const c = s.render.canvas
    c.style.zIndex = layer
  }

  const init: HighlightContext['init'] = (w, h, root) => {
    if (!s) {
      s = new Schedule(root, { width: w, height: h })
    }
    setDisplayLayerForHighlight()
    s.render.canvas.style.position = 'absolute'
    s.render.canvas.style.pointerEvents = 'none'
  }

  const reset = () => {
    if (!s) { return }
    s.destory()
    s.update()
  }

  return {
    init,
    reset,
    setDisplayLayerForHighlight,
    get highlight() {
      return s!
    }
  }
}

function refreshBackgroundLayer(c: SelfEventContenxt): boolean | void {
  const { treemap, self } = c
  const { backgroundLayer, render } = treemap
  const { canvas, ctx, options: { width: ow, height: oh } } = render
  const { layoutWidth: sw, layoutHeight: sh, scaleRatio: ss } = self

  const capture = sw * ss >= ow && sh * ss >= oh
  backgroundLayer.__refresh__ = false
  if (!capture && !self.forceDestroy) {
    resetLayout(treemap, sw * ss, sh * ss)
    render.clear(ow, oh)
    const { dpr } = backgroundLayer.cleanCacheSnapshot()
    drawGraphIntoCanvas(backgroundLayer, { c: canvas, ctx, dpr }, (opts, graph) => {
      if (asserts.isLayer(graph) && !graph.__refresh__) {
        graph.setCacheSnapshot(opts.c)
      }
    })
    self.triggerZoom = false
    return true
  }
}
