import { easing, etoile } from '../etoile'
import { Display, S } from '../etoile/graph/display'
import { DOMEvent, DOM_EVENTS, createEffectScope } from '../etoile/native/dom'
import type { DOMEventMetadata, DOMEventType } from '../etoile/native/dom'
import { Event as _Event } from '../etoile/native/event'
import type { BindThisParameter } from '../etoile/native/event'
import type { ColorDecoratorResultRGB } from '../etoile/native/runtime'
import { type InheritedCollections, createRoundBlock, mixin, prettyStrJoin } from '../shared'
import { applyForOpacity } from './animation'
import type { App, TreemapInstanceAPI } from './component'
import { TreemapLayout } from './component'
import type { LayoutModule } from './squarify'
import { findRelativeNode } from './struct'

export interface PrimitiveEventMetadata<T extends keyof HTMLElementEventMap> {
  native: HTMLElementEventMap[T]
  module: LayoutModule | null
}

export type ExposedEventCallback<T extends DOMEventType> = (metadata: PrimitiveEventMetadata<T>) => void

export type ExposedEventDefinition = {
  [K in DOMEventType]: BindThisParameter<ExposedEventCallback<K>, TreemapInstanceAPI>
}

export interface TreemapEventContext {
  type: DOMEventType
  treemap: TreemapLayout
}

export interface TreemapEventState {
  isDragging: boolean
  forceDestroy: boolean
  currentNode: LayoutModule | null
  dragX: number
  dragY: number
  isWheeling: boolean
}

function createTreemapEventState() {
  return <TreemapEventState> {
    isDragging: false,
    currentNode: null,
    forceDestroy: false,
    isWheeling: false,
    dragX: 0,
    dragY: 0
  }
}

interface EffectOptions {
  duration: number
  stop: () => boolean
  onStop?: () => void
}

export const INTERNAL_EVENT_MAPPINGS = {
  ON_ZOOM: 0o1
} as const

export type InternalEventType = typeof INTERNAL_EVENT_MAPPINGS[keyof typeof INTERNAL_EVENT_MAPPINGS]

export interface InternalEventMappings {
  [INTERNAL_EVENT_MAPPINGS.ON_ZOOM]: (node: LayoutModule) => void
}

export type InternalEventDefinition = {
  [key in InternalEventType]: InternalEventMappings[key]
}

const ANIMATION_DURATION = 300

const fill = <ColorDecoratorResultRGB> { desc: { r: 255, g: 255, b: 255 }, mode: 'rgb' }

function runEffect(callback: (progress: number) => void, opts: EffectOptions) {
  const effect = createEffectScope()
  const startTime = Date.now()
  effect.run(() => {
    const elapsed = Date.now() - startTime
    const progress = Math.min(elapsed / opts.duration, 1)
    if (progress >= 1 || opts.stop()) {
      effect.stop()
      if (opts.onStop) {
        opts.onStop()
      }
      return true
    }
    callback(progress)
  })
}

function drawHighlight(treemap: TreemapLayout, evt: TreemapEvent) {
  const { highlight } = treemap
  const { currentNode } = evt.state
  if (currentNode) {
    const [x, y, w, h] = currentNode.layout
    runEffect((progress) => {
      const easedProgress = easing.cubicInOut(progress)
      highlight.reset()
      const mask = createRoundBlock(x, y, w, h, { fill, opacity: 0.4, radius: 2, margin: 2 })
      highlight.add(mask)
      highlight.setZIndexForHighlight('1')
      applyForOpacity(mask, 0.4, 0.4, easedProgress)
      stackMatrixTransform(mask, evt.matrix.e, evt.matrix.f, evt.matrix.a)
      highlight.update()
    }, {
      duration: ANIMATION_DURATION,
      stop: () => evt.state.isDragging || evt.state.isWheeling
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
  constructor(app: App, treemap: TreemapLayout) {
    super(treemap.render.canvas)
    this.exposedEvent = new _Event()
    this.state = createTreemapEventState()
    const exposedMethods: InheritedCollections[] = [
      { name: 'on', fn: () => this.exposedEvent.bindWithContext(treemap.api) },
      { name: 'off', fn: () => this.exposedEvent.off.bind(this.exposedEvent) }
    ]

    DOM_EVENTS.forEach((evt) => {
      this.on(evt, (metadata: DOMEventMetadata<DOMEventType>) => this.dispatch({ type: evt, treemap }, metadata))
    })

    mixin(app, exposedMethods)
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
        this.exposedEvent.bindWithContext(ctx.treemap.api)
        this.exposedEvent.active('click')
      }
    }

    this.exposedEvent.emit(ctx.type, { native: metadata.native, module: node })
  }

  private onmousemove(ctx: TreemapEventContext, metadata: DOMEventMetadata<'mousemove'>, node: LayoutModule | null) {
    if (!this.state.isDragging) {
      if (this.state.currentNode !== node) {
        this.state.currentNode = node
      }
      drawHighlight(ctx.treemap, this)
    } else {
      // for drag
      const { treemap } = ctx
      treemap.highlight.reset()
      treemap.highlight.setZIndexForHighlight()
      runEffect(() => {
        const { offsetX: x, offsetY: y } = metadata.native
        const { dragX: lastX, dragY: lastY } = this.state
        const drawX = x - lastX
        const drawY = y - lastY
        treemap.reset()
        this.matrix.translation(drawX, drawY)
        Object.assign(this.state, { isDragging: true, dragX: x, dragY: y })
        stackMatrixTransformWithGraphAndLayer(treemap.elements, this.matrix.e, this.matrix.f, this.matrix.a)
        treemap.update()
      }, {
        duration: ANIMATION_DURATION,
        stop: () => this.state.forceDestroy,
        onStop: () => {
          this.state.isDragging = false
        }
      })
    }
  }

  private onwheel(ctx: TreemapEventContext, metadata: DOMEventMetadata<'wheel'>) {
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
    treemap.highlight.reset()
    treemap.highlight.setZIndexForHighlight()
    const factor = absWheelDelta > 3 ? 1.4 : absWheelDelta > 1 ? 1.2 : 1.1
    const delta = wheelDelta > 0 ? factor : 1 / factor
    const targetScaleRatio = this.matrix.a * delta
    const translateX = offsetX - (offsetX - this.matrix.e) * delta
    const translateY = offsetY - (offsetY - this.matrix.f) * delta
    runEffect((progress) => {
      this.state.isWheeling = true
      treemap.reset()
      const easedProgress = easing.quadraticOut(progress)
      const scale = (targetScaleRatio - this.matrix.a) * easedProgress
      this.matrix.a += scale
      this.matrix.d += scale
      this.matrix.translation((translateX - this.matrix.e) * easedProgress, (translateY - this.matrix.f) * easedProgress)
      stackMatrixTransformWithGraphAndLayer(treemap.elements, this.matrix.e, this.matrix.f, this.matrix.a)
      treemap.update()
    }, {
      duration: ANIMATION_DURATION,
      stop: () => false,
      onStop: () => {
        this.state.forceDestroy = false
        this.state.isWheeling = false
      }
    })
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

interface DuckE {
  which: number
}

// Only works for mouseup and mousedown events
function isScrollWheelOrRightButtonOnMouseupAndDown<E extends DuckE = DuckE>(e: E) {
  return e.which === 2 || e.which === 3
}
