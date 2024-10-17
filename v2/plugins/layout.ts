import type { Plugin, PluginContext, RenderLayout } from '../primitives'

export interface LayoutOptions extends Omit<RenderLayout, 'titleAreaHeight'> {
  titleAreaHeight: {
    max: number
    min: number
  }
}

const defaultLayoutOptions = {
  titleAreaHeight: {
    max: 80,
    min: 20
  },
  rectGap: 5,
  rectBorderRadius: 0.5,
  rectBorderWidth: 1.5
} satisfies LayoutOptions

function renderLayout(app: PluginContext, options?: LayoutOptions) {
  const { titleAreaHeight, ...rest } = { ...defaultLayoutOptions, ...options }
  // I think
}

export const layout: Plugin<LayoutOptions> = {
  name: 'preset:layout',
  install(app, options) {
    renderLayout(app, options)
  }
}
