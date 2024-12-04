// etoile is a simple 2D render engine for web and it don't take complex rendering into account.
// So it's no need to implement a complex event algorithm or hit mode.
// If one day etoile need to build as a useful library. Pls rewrite it!
// All of implementation don't want to consider the compatibility of the browser.
// Currently, it doesn't support moving with two finger on a Magic Trackpad.
// Note: All events that need to trigger rendering should call 'createEffectScope'.

import { useMagicTrackpad } from '../etoile/native/magic-trackpad'
import { captureBoxXY, createEffectScope } from '../etoile/native/dom'
import { createFillBlock, isMacOS, mixin } from '../shared'
import { Display, S } from '../etoile/graph/display'
import { Schedule, Event as _Event, asserts, drawGraphIntoCanvas, easing, etoile } from '../etoile'
import type { BindThisParameter } from '../etoile'
import type { ColorDecoratorResultRGB } from '../etoile/native/runtime'
import type { InheritedCollections } from '../shared'
import { applyForOpacity } from './animation'
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
        return true
      }
      const easedProgress = easing.cubicInOut(progress)
      self.highlight.reset()
      const mask = createFillBlock(x, y, w, h, { fill, opacity: 0.4, radius: 2, margin: 2 })
      self.highlight.highlight.add(mask)
      self.highlight.setZIndexForHighlight('1')
      applyForOpacity(mask, 0.4, 0.4, easedProgress)
      stackMatrixTransform(mask, self.translateX, self.translateY, self.scaleRatio)
      self.highlight.highlight.update()
    })
  } else {
    self.highlight.reset()
    self.highlight.setZIndexForHighlight()
  }
}

function applyZoomEvent(ctx: SelfEventContenxt) {
  ctx.treemap.event.on(internalEventMappings.ON_ZOOM, (node: LayoutModule) => {
    const root: LayoutModule | null = null
    if (ctx.self.isDragging) return
    onZoom(ctx, node, root)
  })
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
    // @ts-expect-error
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
    this.self.highlight.setZIndexForHighlight()
    // @ts-expect-error
    this.self.event.off('mousemove', this.self.onmousemove)
    this.treemap.event.off(internalEventMappings.ON_ZOOM)
    this.self.forceDestroy = true

    const effect = createEffectScope()
    const animationDuration = 300
    const startTime = Date.now()

    effect.run(() => {
      const elapsed = Date.now() - startTime
      const progress = Math.min(elapsed / animationDuration, 1)
      if (progress >= 1) {
        effect.stop()
        return true
      }
      if (this.self.triggerZoom) {
        refreshBackgroundLayer(this)
      }
      const { offsetX: x, offsetY: y } = metadata.native
      const { x: lastX, y: lastY } = this.self.draggingState
      const drawX = x - lastX
      const drawY = y - lastY
      this.treemap.reset()
      this.self.translateX += drawX
      this.self.translateY += drawY
      this.self.draggingState = { x, y }
      stackMatrixTransformWithGraphAndLayer(this.treemap.elements, this.self.translateX, this.self.translateY, this.self.scaleRatio)

      this.treemap.update()
    })
  }

  ondragend(this: SelfEventContenxt) {
    if (!this.self.isDragging) {
      return
    }
    this.self.isDragging = false
    this.self.highlight.reset()
    this.self.highlight.setZIndexForHighlight()
    this.self.event.bindWithContext(this)('mousemove', this.self.onmousemove)
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
    const { native } = metadata
    // @ts-expect-error
    const wheelDelta = native.wheelDelta
    const absWheelDelta = Math.abs(wheelDelta)
    const offsetX = native.offsetX
    const offsetY = native.offsetY

    if (wheelDelta === 0) {
      return
    }
    self.forceDestroy = true

    this.self.highlight.reset()
    this.self.highlight.setZIndexForHighlight()
    const factor = absWheelDelta > 3 ? 1.4 : absWheelDelta > 1 ? 1.2 : 1.1
    const delta = wheelDelta > 0 ? factor : 1 / factor
    const targetScaleRatio = self.scaleRatio * delta
    const translateX = offsetX - (offsetX - self.translateX) * delta
    const translateY = offsetY - (offsetY - self.translateY) * delta
    const effect = createEffectScope()

    const animationDuration = 300
    const startTime = Date.now()

    effect.run(() => {
      const elapsed = Date.now() - startTime
      const progress = Math.min(elapsed / animationDuration, 1)
      if (progress >= 1) {
        effect.stop()
        self.forceDestroy = false
        return true
      }
      if (self.triggerZoom) {
        refreshBackgroundLayer(this)
      }
      treemap.reset()
      const easedProgress = easing.quadraticOut(progress)
      self.scaleRatio = self.scaleRatio + (targetScaleRatio - self.scaleRatio) * easedProgress
      self.translateX = self.translateX + (translateX - self.translateX) * easedProgress
      self.translateY = self.translateY + (translateY - self.translateY) * easedProgress
      stackMatrixTransformWithGraphAndLayer(this.treemap.elements, self.translateX, self.translateY, self.scaleRatio)
      treemap.update()
    })
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
    const selfEvents = [...primitiveEvents, 'wheel'] as const
    const selfContext = { treemap, self: this }
    selfEvents.forEach((evt) => {
      nativeEvents.push(bindPrimitiveEvent(treemap.render.canvas, selfContext, evt, event))
    })
    const selfEvt = event.bindWithContext<SelfEventContenxt>(selfContext)
    // Regular drag event binding for windows/linux users or
    // other Darwin users who don't use Magic Trackpad or use three finger drag
    selfEvt('mousedown', this.ondragstart)
    selfEvt('mousemove', this.ondragmove)
    selfEvt('mouseup', this.ondragend)

    // For MacOS, we should inject two finger event
    if (isMacOS()) {
      useMagicTrackpad(treemap.render.canvas, {
        ongesturestart: () => {
        },
        ongesturemove: (metadata) => {
          if (!metadata.isPanGesture) {
            this.onwheel.bind(selfContext)({ native: metadata.native, module: Object.create(null) })
          } else {
            //
          }
        },
        ongestureend: () => {
          console.log('end')
        }
      })
    } else {
      // wheel
      selfEvt('wheel', this.onwheel)
    }

    applyZoomEvent({ treemap, self: this })

    let installHightlightEvent = false

    treemap.event.on(internalEventMappings.ON_LOAD, (width, height, root) => {
      this.highlight.init(width, height, root)

      if (!installHightlightEvent) {
        // highlight
        selfEvt('mousemove', this.onmousemove)
        selfEvt('mouseout', this.onmouseout)
        installHightlightEvent = true
        this.highlight.setZIndexForHighlight()
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
  if (!node) return
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

    const effect = createEffectScope()
    effect.run(() => {
      const elapsed = Date.now() - startTime
      const progress = Math.min(elapsed / animationDuration, 1)
      treemap.backgroundLayer.__refresh__ = false
      if (progress >= 1) {
        effect.stop()
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
  setZIndexForHighlight: (layer?: string) => void
  get highlight(): Schedule
}

function createHighlight(): HighlightContext {
  let s: Schedule | null = null

  const setZIndexForHighlight = (layer: string = '-1') => {
    if (!s) return
    const c = s.render.canvas
    c.style.zIndex = layer
  }

  const init: HighlightContext['init'] = (w, h, root) => {
    if (!s) {
      s = new Schedule(root, { width: w, height: h })
    }
    setZIndexForHighlight()
    s.render.canvas.style.position = 'absolute'
    s.render.canvas.style.pointerEvents = 'none'
  }

  const reset = () => {
    if (!s) return
    s.destory()
    s.update()
  }

  return {
    init,
    reset,
    setZIndexForHighlight,
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
