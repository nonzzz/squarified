import { type ColorDecoratorResult } from '../etoile/native/runtime'
import { TreemapLayout } from './component'
import { getNodeDepth } from './struct'
import type { NativeModule } from './struct'

export type ColorMappings = Record<string, ColorDecoratorResult>

export type Rect = { w: number; h: number }

export type Series<T> = {
  max: T
  min: T
}

export interface RenderColor {
  mappings: ColorMappings
}

export interface RenderLayout {
  titleAreaHeight: Series<number>
  rectBorderRadius: number
  rectBorderWidth: number
  rectGap: number
}

export interface RenderFont {
  color: string
  fontSize: Series<number>
  fontFamily: string
}

export interface RenderDecorator {
  color: RenderColor
  layout: RenderLayout
  font: RenderFont
}

export const defaultLayoutOptions = {
  titleAreaHeight: {
    max: 80,
    min: 20
  },
  rectGap: 5,
  rectBorderRadius: 0.5,
  rectBorderWidth: 1.5
} satisfies RenderLayout

export const defaultFontOptions = {
  color: '#000',
  fontSize: {
    max: 38,
    min: 7
  },
  fontFamily: 'sans-serif'
} satisfies RenderFont

export function presetDecorator(app: TreemapLayout) {
  Object.assign(app.decorator, {
    layout: defaultLayoutOptions,
    font: defaultFontOptions,
    color: colorMappings(app)
  })
}

interface HueState {
  hue: number
}

function colorDecorator(node: NativeModule, state: HueState) {
  const depth = getNodeDepth(node)
  let baseHue = 0
  let sweepAngle = Math.PI * 2
  const totalHueRange = Math.PI
  if (node.parent) {
    sweepAngle = node.weight / node.parent.weight * sweepAngle
    baseHue = state.hue + (sweepAngle / Math.PI * 180)
  }

  baseHue += sweepAngle

  const depthHueOffset = depth + (totalHueRange / 10)
  const finalHue = baseHue + depthHueOffset / 2

  const saturation = 0.6 + 0.4 * Math.max(0, Math.cos(finalHue))
  const lightness = 0.5 + 0.2 * Math.max(0, Math.cos(finalHue + Math.PI * 2 / 3))

  state.hue = baseHue

  return {
    mode: 'hsl',
    desc: {
      h: finalHue,
      s: Math.round(saturation * 100),
      l: Math.round(lightness * 100)
    }
  } satisfies ColorDecoratorResult
}

function evaluateColorMappingByNode(node: NativeModule, state: HueState) {
  const colorMappings: ColorMappings = {}
  if (node.groups && Array.isArray(node.groups)) {
    for (const child of node.groups) {
      Object.assign(colorMappings, evaluateColorMappingByNode(child, state))
    }
  }

  if (node.id) {
    colorMappings[node.id] = colorDecorator(node, state)
  }

  return colorMappings
}

function colorMappings(app: TreemapLayout) {
  const colorMappings: ColorMappings = {}
  const state: HueState = {
    hue: 0
  }
  for (const node of app.data) {
    Object.assign(colorMappings, evaluateColorMappingByNode(node, state))
  }
  return { mappings: colorMappings } satisfies RenderColor
}
