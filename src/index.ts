export { createTreemap } from './primitives/component'
export type { App, TreemapInstanceAPI, TreemapOptions, unstable_use } from './primitives/component'
export { TreemapLayout } from './primitives/component'
export * from './primitives/decorator'

import type { DOMEventType } from './etoile/native/dom'
import type { ExposedEventCallback, ExposedEventDefinition, ExposedEventMethods } from './primitives/event'

/**
 * @deprecated compat `PrimitiveEvent` using `DOMEventType` replace it. (will be removed in the next three versions.)
 */
export type PrimitiveEvent = DOMEventType

/**
 * @deprecated compat `EventMethods` using `ExposedEventMethods` replace it. (will be removed in the next three versions.)
 */
export type EventMethods = ExposedEventMethods

/**
 * @deprecated compat `PrimitiveEventCallback` using `ExposedEventCallback` replace it. (will be removed in the next three versions.)
 */
export type PrimitiveEventCallback<T extends PrimitiveEvent> = ExposedEventCallback<T>

/**
 * @deprecated compat `PrimitiveEventDefinition` using `ExposedEventDefinition` replace it. (will be removed in the next three versions.)
 */
export type PrimitiveEventDefinition = ExposedEventDefinition

export type { DOMEventType } from './etoile/native/dom'
export type { ExposedEventCallback, ExposedEventDefinition, ExposedEventMethods, PrimitiveEventMetadata } from './primitives/event'
export type { LayoutModule } from './primitives/squarify'
export {
  c2m,
  findRelativeNode,
  findRelativeNodeById,
  flatten as flattenModule,
  getNodeDepth,
  sortChildrenByKey,
  visit
} from './primitives/struct'
export type { Module, NativeModule } from './primitives/struct'
