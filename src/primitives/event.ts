import { asserts, easing, traverse } from '../etoile'
import { Display, Graph, S } from '../etoile/graph/display'
import { DOMEvent, DOM_EVENTS, createEffectScope } from '../etoile/native/dom'
import type { DOMEventMetadata, DOMEventType } from '../etoile/native/dom'
import { Event as _Event } from '../etoile/native/event'
import type { BindThisParameter } from '../etoile/native/event'
import { useMagicTrackPad } from '../etoile/native/magic-trackpad'
import type { ColorDecoratorResultRGB } from '../etoile/native/runtime'
import { createRoundBlock, isMacOS, mixin, prettyStrJoin } from '../shared'
import type { InheritedCollections } from '../shared'
import type { App, TreemapInstanceAPI } from './component'
import { TreemapLayout, resetLayout } from './component'
import type { LayoutModule } from './squarify'
import { findRelativeNode, findRelativeNodeById } from './struct'
import type { NativeModule } from './struct'

export interface PrimitiveEventMetadata<T extends keyof HTMLElementEventMap> {
  native: HTMLElementEventMap[T]
  module: LayoutModule | null
}

export type ExposedEventCallback<T extends DOMEventType> = (metadata: PrimitiveEventMetadata<T>) => void

export type ExposedEventDefinition = {
  [K in DOMEventType]: BindThisParameter<ExposedEventCallback<K>, TreemapInstanceAPI>
}

export interface ExposedEventMethods<C = TreemapInstanceAPI, D = ExposedEventDefinition> {
  on<Evt extends keyof D>(
    evt: Evt,
    handler: BindThisParameter<D[Evt], unknown extends C ? this : C>
  ): void
  off<Evt extends keyof D>(
    evt: keyof D,
    handler?: BindThisParameter<D[Evt], unknown extends C ? this : C>
  ): void
}

export interface TreemapEventContext {
  type: DOMEventType | 'macOSWheel'
  treemap: TreemapLayout
}

export interface TreemapEventState {
  isDragging: boolean
  isWheeling: boolean
  isZooming: boolean
  forceDestroy: boolean
  currentNode: LayoutModule | null
  dragX: number
  dragY: number
}

function createTreemapEventState() {
  return <TreemapEventState> {
    isDragging: false,
    isWheeling: false,
    isZooming: false,
    currentNode: null,
    forceDestroy: false,
    dragX: 0,
    dragY: 0
  }
}

interface EffectOptions {
  duration: number
  onStop?: () => void
  deps?: Array<() => boolean>
}

export const INTERNAL_EVENT_MAPPINGS = {
  ON_ZOOM: 0o1,
  ON_CLEANUP: 0o3
} as const

export type InternalEventType = typeof INTERNAL_EVENT_MAPPINGS[keyof typeof INTERNAL_EVENT_MAPPINGS]

export interface InternalEventMappings {
  [INTERNAL_EVENT_MAPPINGS.ON_ZOOM]: (node: LayoutModule) => void
  [INTERNAL_EVENT_MAPPINGS.ON_CLEANUP]: () => void
}

export type InternalEventDefinition = {
  [key in InternalEventType]: InternalEventMappings[key]
}

const ANIMATION_DURATION = 300

const fill = <ColorDecoratorResultRGB> { desc: { r: 255, g: 255, b: 255 }, mode: 'rgb' }

function runEffect(callback: (progress: number, cleanup: () => void) => void, opts: EffectOptions) {
  const effect = createEffectScope()
  const startTime = Date.now()

  const condtion = (process: number) => {
    if (Array.isArray(opts.deps)) {
      return opts.deps.some((dep) => dep())
    }
    return process >= 1
  }

  effect.run(() => {
    const elapsed = Date.now() - startTime
    const progress = Math.min(elapsed / opts.duration, 1)
    if (condtion(progress)) {
      effect.stop()
      if (opts.onStop) {
        opts.onStop()
      }
      return true
    }
    return callback(progress, effect.stop)
  })
}

export function applyForOpacity(graph: Graph, lastState: number, nextState: number, easedProgress: number) {
  const alpha = lastState + (nextState - lastState) * easedProgress
  if (asserts.isRoundRect(graph)) {
    graph.style.opacity = alpha
  }
}

function drawHighlight(treemap: TreemapLayout, evt: TreemapEvent) {
  const { highlight } = treemap
  const { currentNode } = evt.state
  if (currentNode) {
    const [x, y, w, h] = currentNode.layout
    runEffect((progress, cleanup) => {
      cleanup()
      const easedProgress = easing.quadraticOut(progress)
      highlight.reset()
      const mask = createRoundBlock(x, y, w, h, { fill, opacity: 0.4, radius: 2, padding: 2 })
      highlight.add(mask)
      highlight.setZIndexForHighlight('1')
      applyForOpacity(mask, 0.4, 0.4, easedProgress)
      stackMatrixTransform(mask, evt.matrix.e, evt.matrix.f, 1)
      highlight.update()
      if (!evt.state.currentNode) {
        return true
      }
    }, {
      duration: ANIMATION_DURATION,
      deps: [() => evt.state.isDragging, () => evt.state.isWheeling, () => evt.state.isZooming]
    })
  } else {
    highlight.reset()
    highlight.setZIndexForHighlight()
  }
}

// TODO: Do we need turn off internal events?
export class TreemapEvent extends DOMEvent {
  private exposedEvent: _Event<ExposedEventDefinition>
  state: TreemapEventState
  zoom: ReturnType<typeof createOnZoom>
  constructor(app: App, treemap: TreemapLayout) {
    super(treemap.render.canvas)
    this.exposedEvent = new _Event()
    this.state = createTreemapEventState()
    const exposedMethods: InheritedCollections[] = [
      { name: 'on', fn: () => this.exposedEvent.bindWithContext(treemap.api) },
      { name: 'off', fn: () => this.exposedEvent.off.bind(this.exposedEvent) }
    ]

    // eslint-disable-next-line unused-imports/no-unused-vars, @typescript-eslint/no-unused-vars
    const macOS = isMacOS()

    DOM_EVENTS.forEach((evt) => {
      this.on(evt, (metadata: DOMEventMetadata<DOMEventType>) => {
        // if (evt === 'wheel' && macOS) {
        //   this.dispatch({ type: 'macOSWheel', treemap }, metadata)
        //   return
        // }
        this.dispatch({ type: evt, treemap }, metadata)
      })
    })

    mixin(app, exposedMethods)

    treemap.event.on(INTERNAL_EVENT_MAPPINGS.ON_CLEANUP, () => {
      this.matrix.create({ a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 })
      this.state = createTreemapEventState()
    })
    this.zoom = createOnZoom(treemap, this)

    treemap.event.on(INTERNAL_EVENT_MAPPINGS.ON_ZOOM, this.zoom)
  }

  private dispatch(ctx: TreemapEventContext, metadata: DOMEventMetadata<DOMEventType>) {
    const node = findRelativeNode(metadata.loc, ctx.treemap.layoutNodes)

    const fn = prettyStrJoin('on', ctx.type)

    // @ts-expect-error safe
    if (typeof this[fn] === 'function') {
      // @ts-expect-error safe
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call
      this[fn](ctx, metadata, node)
    }

    // note: onmouseup event will trigger click event together
    if (ctx.type === 'mousemove') {
      if (this.state.isDragging) {
        this.exposedEvent.silent('click')
      } else {
        this.exposedEvent.active('click')
      }
    }

    // For macOS
    this.exposedEvent.emit(ctx.type === 'macOSWheel' ? 'wheel' : ctx.type, { native: metadata.native, module: node })
  }

  private onmousemove(ctx: TreemapEventContext, metadata: DOMEventMetadata<'mousemove'>, node: LayoutModule | null) {
    if (!this.state.isDragging) {
      if (this.state.currentNode !== node || !node) {
        this.state.currentNode = node
      }
      drawHighlight(ctx.treemap, this)
    } else {
      // for drag
      const { treemap } = ctx
      runEffect((_, cleanup) => {
        cleanup()
        const { offsetX: x, offsetY: y } = metadata.native
        const { dragX: lastX, dragY: lastY } = this.state
        const drawX = x - lastX
        const drawY = y - lastY
        treemap.highlight.reset()
        treemap.highlight.setZIndexForHighlight()
        treemap.reset()
        this.matrix.translation(drawX, drawY)
        Object.assign(this.state, { isDragging: true, dragX: x, dragY: y })
        stackMatrixTransformWithGraphAndLayer(treemap.elements, this.matrix.e, this.matrix.f, 1)
        treemap.update()
        return true
      }, {
        duration: ANIMATION_DURATION,
        deps: [() => this.state.forceDestroy],
        onStop: () => {
          this.state.isDragging = false
        }
      })
    }
  }

  private onmouseout(ctx: TreemapEventContext) {
    this.state.currentNode = null
    drawHighlight(ctx.treemap, this)
  }

  private onmousedown(ctx: TreemapEventContext, metadata: DOMEventMetadata<'mousedown'>) {
    if (isScrollWheelOrRightButtonOnMouseupAndDown(metadata.native)) {
      return
    }
    this.state.isDragging = true
    this.state.dragX = metadata.native.offsetX
    this.state.dragY = metadata.native.offsetY
    this.state.forceDestroy = false
    if (!ctx.treemap.renderCache.state) {
      this.exposedEvent.silent('mousemove')
      this.silent('mousemove')
      ctx.treemap.renderCache.flush(ctx.treemap, this.matrix)
      this.active('mousemove')
      this.exposedEvent.active('mousemove')
    }
  }

  private onmouseup(ctx: TreemapEventContext) {
    if (!this.state.isDragging) {
      return
    }
    this.state.forceDestroy = true
    this.state.isDragging = false
    const { treemap } = ctx
    treemap.highlight.reset()
    treemap.highlight.setZIndexForHighlight()
  }

  private onwheel(ctx: TreemapEventContext, metadata: DOMEventMetadata<'wheel'>) {
    ctx.treemap.renderCache.destroy()

    this.silent('mousedown')
    this.exposedEvent.silent('mousemove')
    this.silent('mousemove')
    const { native } = metadata
    const { treemap } = ctx
    // @ts-expect-error safe
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const wheelDelta = native.wheelDelta
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    const absWheelDelta = Math.abs(wheelDelta)
    const offsetX = native.offsetX
    const offsetY = native.offsetY
    if (wheelDelta === 0) {
      return
    }

    this.state.forceDestroy = true
    const factor = absWheelDelta > 3 ? 1.4 : absWheelDelta > 1 ? 1.2 : 1.1
    const delta = wheelDelta > 0 ? factor : 1 / factor
    const targetScaleRatio = this.matrix.a * delta
    const translateX = offsetX - (offsetX - this.matrix.e) * delta
    const translateY = offsetY - (offsetY - this.matrix.f) * delta
    runEffect((progress, cleanup) => {
      cleanup()
      treemap.highlight.reset()
      treemap.highlight.setZIndexForHighlight()
      treemap.fontCache.flush(treemap, this.matrix)
      this.state.isWheeling = true
      const easedProgress = easing.cubicIn(progress)
      const scale = (targetScaleRatio - this.matrix.a) * easedProgress
      this.matrix.a += scale
      this.matrix.d += scale
      this.matrix.translation((translateX - this.matrix.e) * easedProgress, (translateY - this.matrix.f) * easedProgress)

      // Each shape will scale by schedule phase. (According the dpi)
      // So that if the DPI is more than 1. we need to shrink first. ( w / dpi , h / dpi )
      // Schedule will scale it back to the original size.
      resetLayout(
        treemap,
        treemap.render.canvas.width * this.matrix.a / treemap.render.options.devicePixelRatio,
        treemap.render.canvas.height * this.matrix.d / treemap.render.options.devicePixelRatio
      )
      stackMatrixTransformWithGraphAndLayer(treemap.elements, this.matrix.e, this.matrix.f, 1)
      treemap.update()
    }, {
      duration: ANIMATION_DURATION,
      onStop: () => {
        this.state.forceDestroy = false
        this.state.isWheeling = false
        this.active('mousedown')
        this.active('mousemove')
        this.exposedEvent.active('mousemove')
      }
    })
  }

  private onmacOSWheel(ctx: TreemapEventContext, metadata: DOMEventMetadata<'wheel'>) {
    useMagicTrackPad(metadata.native)
  }
}

function stackMatrixTransform(graph: S, e: number, f: number, scale: number) {
  graph.x = graph.x * scale + e
  graph.y = graph.y * scale + f
  graph.scaleX = scale
  graph.scaleY = scale
}

function stackMatrixTransformWithGraphAndLayer(graphs: Display[], e: number, f: number, scale: number) {
  traverse(graphs, (graph) => stackMatrixTransform(graph, e, f, scale))
}

interface DuckE {
  which: number
}

// Only works for mouseup and mousedown events
function isScrollWheelOrRightButtonOnMouseupAndDown<E extends DuckE = DuckE>(e: E) {
  return e.which === 2 || e.which === 3
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

// TODO I think onWheel is same as the zoom logical, abstract those part can reduce the bundle size and cleanup the code
// Btw...

function createOnZoom(treemap: TreemapLayout, evt: TreemapEvent) {
  let root: LayoutModule | null = null
  return (node: LayoutModule) => {
    treemap.renderCache.destroy()
    evt.state.isZooming = true
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
      const initialScale = evt.matrix.a
      const initialTranslateX = evt.matrix.e
      const initialTranslateY = evt.matrix.f
      runEffect((progess) => {
        const easedProgress = easing.cubicInOut(progess)
        const scaleRatio = initialScale + (scale - initialScale) * easedProgress
        evt.matrix.a = scaleRatio
        evt.matrix.d = scaleRatio
        evt.matrix.e = initialTranslateX + (translateX - initialTranslateX) * easedProgress
        evt.matrix.f = initialTranslateY + (translateY - initialTranslateY) * easedProgress
        // treemap.reset()
        resetLayout(treemap, w, h)
        stackMatrixTransformWithGraphAndLayer(treemap.elements, evt.matrix.e, evt.matrix.f, evt.matrix.a)
        treemap.update()
      }, {
        duration: ANIMATION_DURATION,
        onStop: () => {
          evt.state.isZooming = false
        }
      })
    }
    root = node
  }
}
