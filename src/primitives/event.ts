import { easing, etoile } from '../etoile'
import type { InheritedCollections } from '../shared'
import { createFillBlock, mixin } from '../shared'
import { DOMEvent, DOMEventMetadata, DOM_EVENTS, createEffectScope } from '../etoile/native/dom'
import { DOMEventType } from '../etoile/native/dom'
import { Event } from '../etoile/native/event'
import type { BindThisParameter } from '../etoile/native/event'
import type { ColorDecoratorResultRGB } from '../etoile/native/runtime'
import { Display, S } from '../etoile/graph/display'
import { TreemapLayout } from './component'
import type { App, TreemapInstanceAPI } from './component'
import type { LayoutModule } from './squarify'
import { findRelativeNode } from './struct'
import { applyForOpacity } from './animation'

export interface PrimitiveEventMetadata<T extends keyof HTMLElementEventMap> {
  native: HTMLElementEventMap[T]
  module: LayoutModule
}

export type ExposedEventCallback<T extends DOMEventType> = (metadata: PrimitiveEventMetadata<T>) => void

export type ExposedEventDefinition = {
  [K in DOMEventType]: BindThisParameter<ExposedEventCallback<K>, TreemapInstanceAPI>
}

interface SelfEventContext {
  treemap: TreemapLayout
  // eslint-disable-next-line no-use-before-define
  self: TreemapEvent
  type?: DOMEventType
}

interface DraggingState {
  x: number
  y: number
  isDragging: boolean
}

const fill = <ColorDecoratorResultRGB> { desc: { r: 255, g: 255, b: 255 }, mode: 'rgb' }

function drawHighit(c: SelfEventContext) {
  const { self, treemap: { highlight } } = c
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
        highlight.reset()
        highlight.setZIndexForHighlight()
        return true
      }
      const easedProgress = easing.cubicInOut(progress)
      highlight.reset()
      const mask = createFillBlock(x, y, w, h, { fill, opacity: 0.4, radius: 2, margin: 2 })
      highlight.add(mask)
      highlight.setZIndexForHighlight('1')
      applyForOpacity(mask, 0.4, 0.4, easedProgress)
      stackMatrixTransform(mask, self.translateX, self.translateY, self.scaleRatio)
      highlight.update()
    })
  } else {
    highlight.reset()
    highlight.setZIndexForHighlight()
  }
}

// TODO: use FSM refactor event handle...
export class TreemapEvent extends DOMEvent {
  exposedEvent: Event<ExposedEventDefinition>
  draggingState: DraggingState
  currentNode: LayoutModule | null
  forceDestroy: boolean
  scaleRatio: number
  translateX: number
  translateY: number
  constructor(app: App, treemap: TreemapLayout) {
    super(treemap.render.canvas)
    this.exposedEvent = new Event()
    this.currentNode = null
    this.forceDestroy = false
    this.translateX = 0
    this.translateY = 0
    this.scaleRatio = 1
    this.draggingState = { x: 0, y: 0, isDragging: false }
    const exposedMethods: InheritedCollections[] = [
      { name: 'on', fn: () => this.exposedEvent.bindWithContext(treemap.api) },
      { name: 'off', fn: () => this.exposedEvent.off }
    ]

    DOM_EVENTS.forEach(evt => {
      this.on(evt, (metadata: any) => {
        this.exposedEvent.emit(evt, wrapMetadataAsPrimitive<any>(metadata, treemap.layoutNodes))
      })
      this.on(evt, this.dispatch, { self: this, treemap, type: evt })
    })

    mixin(app, exposedMethods)
  }

  dragstart(this: SelfEventContext, metadata: PrimitiveEventMetadata<'mousedown'>) {
    const { native } = metadata
    if (isScrollWheelOrRightButtonOnMouseupAndDown(native)) {
      return
    }
    this.self.draggingState = {
      x: metadata.native.offsetX,
      y: metadata.native.offsetY,
      isDragging: true
    }
  }

  dragmove(this: SelfEventContext, metadata: PrimitiveEventMetadata<'mousemove'>) {
    if (!this.self.draggingState.isDragging) {
      if ('zoom' in this.treemap.event.eventCollections) {
        const condit = this.treemap.event.eventCollections.zoom.length > 0
        if (!condit) {
          // applyZoomEvent(this)
        }
      }
    }
    this.treemap.highlight.reset()
    this.treemap.highlight.setZIndexForHighlight()
    // @ts-expect-error
    this.self.off('mousemove', this.self.highlight)
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
      // if (this.self.triggerZoom) {
      //   refreshBackgroundLayer(this)
      // }
      const { offsetX: x, offsetY: y } = metadata.native
      const { x: lastX, y: lastY } = this.self.draggingState
      const drawX = x - lastX
      const drawY = y - lastY
      this.treemap.reset()
      this.self.translateX += drawX
      this.self.translateY += drawY
      this.self.draggingState = { x, y, isDragging: true }
      stackMatrixTransformWithGraphAndLayer(this.treemap.elements, this.self.translateX, this.self.translateY, this.self.scaleRatio)
      this.treemap.update()
    })
  }

  dragend(this: SelfEventContext) {
    if (!this.self.draggingState.isDragging) {
      return
    }
    this.self.draggingState.isDragging = false
    this.treemap.highlight.reset()
    this.treemap.highlight.setZIndexForHighlight()
  }

  wheel(this: SelfEventContext, metadata: PrimitiveEventMetadata<'wheel'>) {
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

    treemap.highlight.reset()
    treemap.highlight.setZIndexForHighlight()
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
      // if (self.triggerZoom) {
      //   refreshBackgroundLayer(this)
      // }
      treemap.reset()
      const easedProgress = easing.quadraticOut(progress)
      self.scaleRatio = self.scaleRatio + (targetScaleRatio - self.scaleRatio) * easedProgress
      self.translateX = self.translateX + (translateX - self.translateX) * easedProgress
      self.translateY = self.translateY + (translateY - self.translateY) * easedProgress
      stackMatrixTransformWithGraphAndLayer(this.treemap.elements, self.translateX, self.translateY, self.scaleRatio)
      treemap.update()
    })
  }

  highlight(this: SelfEventContext, metadata: PrimitiveEventMetadata<'mousemove'>) {
    const { module: node } = metadata
    if (this.self.currentNode !== node) {
      this.self.currentNode = node
    }
    drawHighit(this)
  }

  private dispatch(this: SelfEventContext, metadata: DOMEventMetadata) {
    const node = findRelativeNode(metadata.loc, this.treemap.layoutNodes)
    switch (this.type) {
      case 'mousedown':
        this.self.dragstart.bind(this)({ native: metadata.native, module: node! })
        break
      case 'mousemove':
        if (!this.self.draggingState.isDragging) {
          this.self.highlight.bind(this)({ native: metadata.native, module: node! })
        } else {
          this.self.dragmove.bind(this)({ native: metadata.native, module: node! })
        }
        break
      case 'mouseout':
        if (!this.self.draggingState.isDragging) {
          this.self.currentNode = null
          this.self.forceDestroy = true
          drawHighit(this)
        }
        break
      case 'mouseup':
        this.self.dragend.bind(this)()
        break
      case 'wheel':
        this.self.wheel.bind(this)({ native: metadata.native, module: node! })
        break
    }
  }
}

function wrapMetadataAsPrimitive<T extends keyof HTMLElementEventMap>(metadata: DOMEventMetadata<T>, nodes: LayoutModule[]) {
  return <PrimitiveEventMetadata<T>> { native: metadata.native, module: findRelativeNode(metadata.loc, nodes) }
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
