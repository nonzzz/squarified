// /* eslint-disable no-use-before-define */
// export interface PrimitiveRender {
//   use<Options>(plugin: Plugin<Options>, options: Options): this
// }

import { App } from './render'
import type { RenderDecorator } from './render'

export interface PluginContext {
  render: App['render']
  setRenderDecorator: (decorator: Partial<RenderDecorator>) => void
}

export type PluginInstallFunction<Options = unknown> = (app: PluginContext, options?: Options) => any

export interface Plugin<Options = unknown> {
  name: string
  order: 'pre' | 'post'
  install: PluginInstallFunction<Options>
}
