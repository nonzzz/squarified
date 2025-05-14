// Because of the cache system. scale factor is not needed to apply.
// Eg. Only use scale factor when the layout is changed.

import { easing, traverse } from '../etoile'
import { Display, S } from '../etoile/graph/display'
import { DOMEvent, DOM_EVENTS, createSmoothFrame } from '../etoile/native/dom'
import type { DOMEventMetadata, DOMEventType } from '../etoile/native/dom'
import { Event as _Event } from '../etoile/native/event'
import { useMagicTrackPad } from '../etoile/native/magic-trackpad'
import { isMacOS, mixin, prettyStrJoin } from '../shared'
import type { InheritedCollections } from '../shared'
import type { App } from './component'
import { TreemapLayout, resetLayout } from './component'
import type { LayoutModule } from './squarify'
import { findRelativeNode } from './struct'

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

function smoothFrame(callback: (progress: number, cleanup: () => void) => void, opts: EffectOptions) {
  const frame = createSmoothFrame()
  const startTime = Date.now()

  const condtion = (process: number) => {
    if (Array.isArray(opts.deps)) {
      return opts.deps.some((dep) => dep())
    }
    return process >= 1
  }

  frame.run(() => {
    const elapsed = Date.now() - startTime
    const progress = Math.min(elapsed / opts.duration, 1)
    if (condtion(progress)) {
      frame.stop()
      if (opts.onStop) {
        opts.onStop()
      }
      return true
    }
    return callback(progress, frame.stop)
  })
}

// TODO: Do we need turn off internal events?
export class TreemapEvent extends DOMEvent {
  exposedEvent: _Event<ExposedEventDefinition>
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

  private onwheel(ctx: TreemapEventContext, metadata: DOMEventMetadata<'wheel'>) {
    ctx.treemap.renderCache.destroy()

    ctx.treemap.event.silent(INTERNAL_EVENT_MAPPINGS.ON_ZOOM)

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
    smoothFrame((progress, cleanup) => {
      this.exposedEvent.silent('mousemove')
      this.silent('mousemove')
      this.silent('click')
      this.exposedEvent.silent('click')
      treemap.highlight.reset()
      treemap.highlight.setZIndexForHighlight()
      treemap.fontCache.flush(treemap, this.matrix)
      this.state.isWheeling = true
      const easedProgress = easing.cubicInOut(progress)
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
      cleanup()
    }, {
      duration: ANIMATION_DURATION,
      onStop: () => {
        this.state.forceDestroy = false
        this.state.isWheeling = false
        // this.active('mousedown')
        this.active('mousemove')
        this.exposedEvent.active('mousemove')
        this.active('click')
        this.exposedEvent.active('click')
        treemap.event.active(INTERNAL_EVENT_MAPPINGS.ON_ZOOM)
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

function createOnZoom(treemap: TreemapLayout, evt: TreemapEvent) {
  return (node: LayoutModule) => {
    treemap.renderCache.destroy()
    evt.state.isZooming = true
    const c = treemap.render.canvas
    const boundingClientRect = c.getBoundingClientRect()
    if (node) {
      const [mx, my, mw, mh] = node.layout
      const factor = Math.min(boundingClientRect.width / mw, boundingClientRect.height / mh)
      const targetScale = factor * evt.matrix.a
      const translateX = (boundingClientRect.width / 2) - (mx + mw / 2) * factor
      const translateY = (boundingClientRect.height / 2) - (my + mh / 2) * factor
      smoothFrame((progress, cleanup) => {
        cleanup()
        evt.silent('mousemove')
        evt.exposedEvent.silent('mousemove')
        treemap.fontCache.flush(treemap, evt.matrix)
        const easedProgress = easing.cubicInOut(progress)
        const scale = (targetScale - evt.matrix.a) * easedProgress
        evt.matrix.a += scale
        evt.matrix.d += scale
        evt.matrix.translation((translateX - evt.matrix.e) * easedProgress, (translateY - evt.matrix.f) * easedProgress)
        resetLayout(
          treemap,
          treemap.render.canvas.width * evt.matrix.a / treemap.render.options.devicePixelRatio,
          treemap.render.canvas.height * evt.matrix.d / treemap.render.options.devicePixelRatio
        )
        stackMatrixTransformWithGraphAndLayer(treemap.elements, evt.matrix.e, evt.matrix.f, 1)
        treemap.update()
      }, {
        duration: ANIMATION_DURATION,
        onStop: () => {
          evt.state.isZooming = false
          evt.active('mousemove')
          evt.exposedEvent.active('mousemove')
        }
      })
    }
  }
}
