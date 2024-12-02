import type { InheritedCollections } from '../shared'
import { mixin } from '../shared'
import { DOMEvent, DOMEventMetadata, DOM_EVENTS, bindDOMEvent } from '../etoile/native/dom'
import { DOMEventType } from '../etoile/native/dom'
import { Event } from '../etoile/native/event'
import type { BindThisParameter } from '../etoile/native/event'
import { TreemapLayout } from './component'
import type { App, TreemapInstanceAPI } from './component'
import type { LayoutModule } from './squarify'
import { findRelativeNode } from './struct'

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

export class TreemapEvent extends DOMEvent {
  exposedEvent: Event<ExposedEventDefinition>
  constructor(app: App, treemap: TreemapLayout) {
    super(treemap.render.canvas)
    this.exposedEvent = new Event()
    const exposedMethods: InheritedCollections[] = [
      { name: 'on', fn: () => this.exposedEvent.bindWithContext(treemap.api) },
      { name: 'off', fn: () => this.exposedEvent.off }
    ]
    // Highlight
    bindDOMEvent(treemap.higlight.render.canvas, 'mousemove', treemap.higlight.event)
    bindDOMEvent(treemap.higlight.render.canvas, 'mouseout', treemap.higlight.event)
    DOM_EVENTS.forEach(evt => {
      this.on(evt, (metadata: any) => {
        this.exposedEvent.emit(evt, wrapMetadataAsPrimitive<any>(metadata, treemap.layoutNodes))
      })
      this.on(evt, this.dispatch, { self: this, treemap, type: evt })
    })

    treemap.higlight.event.on('click', (x) => {
      console.log(x)
    })
    // treemap.higlight.event.bi
    mixin(app, exposedMethods)
  }

  private dispatch(this: SelfEventContext, metadata: DOMEventMetadata) {
    switch (this.type) {
      case 'mousedown':
        break
      case 'mousemove':
        break
      case 'mouseup':
        break
      case 'wheel':
        break
    }
  }
}

function wrapMetadataAsPrimitive<T extends keyof HTMLElementEventMap>(metadata: DOMEventMetadata<T>, nodes: LayoutModule[]) {
  return <PrimitiveEventMetadata<T>> { native: metadata.native, module: findRelativeNode(metadata.loc, nodes) }
}
