import type { Plugin, PluginContext, RenderFont, RenderLayout, Series } from '../primitives'

export interface LayoutOptions {
  layout?: RenderLayout
  font?: RenderFont
}

const defaultLayoutOptions = {
  titleAreaHeight: {
    max: 80,
    min: 20
  },
  rectGap: 5,
  rectBorderRadius: 0.5,
  rectBorderWidth: 1.5
} satisfies RenderLayout

const defaultFontOptions = {
  color: '#000',
  fontSize: {
    max: 38,
    min: 7
  },
  fontFamily: 'sans-serif'
} satisfies RenderFont

function renderLayout(app: PluginContext, options?: LayoutOptions) {
  app.setRenderDecorator({
    layout: { ...defaultLayoutOptions, ...options?.layout },
    font: {
      ...defaultFontOptions,
      ...options?.font
    }
  })
}

export function charCodeWidth(c: CanvasRenderingContext2D, ch: number) {
  return c.measureText(String.fromCharCode(ch)).width
}

export function evaluateOptimalFontSize(
  c: CanvasRenderingContext2D,
  text: string,
  width: number,
  fontRange: Series<number>,
  fontFamily: string,
  height: number
) {
  height = Math.floor(height)
  let optimalFontSize = fontRange.min
  for (let fontSize = fontRange.min; fontSize <= fontRange.max; fontSize++) {
    c.font = `${fontSize}px ${fontFamily}`
    let textWidth = 0
    const textHeight = fontSize
    let i = 0
    while (i < text.length) {
      const codePointWidth = charCodeWidth(c, text.charCodeAt(i))
      textWidth += codePointWidth
      i++
    }
    if (textWidth >= width) {
      const overflow = textWidth - width
      const ratio = overflow / textWidth
      const newFontSize = Math.abs(Math.floor(fontSize - fontSize * ratio))
      optimalFontSize = newFontSize || fontRange.min
      break
    }
    if (textHeight >= height) {
      const overflow = textHeight - height
      const ratio = overflow / textHeight
      const newFontSize = Math.abs(Math.floor(fontSize - fontSize * ratio))
      optimalFontSize = newFontSize || fontRange.min
      break
    }
    optimalFontSize = fontSize
  }
  return optimalFontSize
}

export function getSafeText(c: CanvasRenderingContext2D, text: string, width: number) {
  const ellipsisWidth = c.measureText('...').width
  if (width < ellipsisWidth) {
    return false
  }
  let textWidth = 0
  let i = 0
  while (i < text.length) {
    const codePointWidth = charCodeWidth(c, text.charCodeAt(i))
    textWidth += codePointWidth
    i++
  }
  if (textWidth < width) {
    return { text, width: textWidth }
  }
  return { text: '...', width: ellipsisWidth }
}

export const layout: Plugin<LayoutOptions> = {
  name: 'preset:layout',
  order: 'pre',
  install(app, options) {
    renderLayout(app, options)
  }
}
