/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { type ColorDecoratorResult } from '../etoile/native/runtime'
import { hashCode } from '../shared'
import { TreemapLayout } from './component'
import type { NativeModule } from './struct'

export type ColorMappings = Record<string, ColorDecoratorResult>

export type Rect = { w: number, h: number }

export type Series<T> = {
  max: T,
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
    max: 60,
    min: 30
  },
  rectGap: 5,
  rectBorderRadius: 0.5,
  rectBorderWidth: 1.5
} satisfies RenderLayout

export const defaultFontOptions = {
  color: '#000',
  fontSize: {
    max: 70,
    min: 0
  },
  fontFamily: 'sans-serif'
} satisfies RenderFont

export function presetDecorator(app: TreemapLayout) {
  Object.assign(app.decorator, {
    layout: defaultLayoutOptions,
    font: defaultFontOptions,
    color: { mappings: evaluateColorMappings(app.data) }
  })
}

function evaluateColorMappings(data: NativeModule[]): ColorMappings {
  const colorMappings: ColorMappings = {}

  const hashToHue = (id: string): number => {
    const hash = Math.abs(hashCode(id))
    return hash % 360
  }

  const lightScale = (depth: number) => 60 - depth * 5
  const baseSaturation = 70
  const siblingHueShift = 30

  const rc = 0.2126
  const gc = 0.7152
  const bc = 0.0722

  const hslToRgb = (h: number, s: number, l: number): { r: number, g: number, b: number } => {
    const a = s * Math.min(l, 1 - l)
    const f = (n: number) => {
      const k = (n + h / 30) % 12
      return l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1)
    }
    return { r: f(0), g: f(8), b: f(4) }
  }

  const calculateLuminance = (r: number, g: number, b: number): number => {
    return rc * r + gc * g + bc * b
  }

  const calculateColor = (
    module: NativeModule,
    depth: number,
    parentHue: number | null,
    siblingIndex: number,
    totalSiblings: number
  ) => {
    const nodeHue = hashToHue(module.id)
    const hue = parentHue !== null
      ? (parentHue + siblingHueShift * siblingIndex / totalSiblings) % 360
      : nodeHue
    const lightness = lightScale(depth)

    const hslColor = {
      h: hue,
      s: baseSaturation,
      l: lightness / 100
    }
    const { r, g, b } = hslToRgb(hslColor.h, hslColor.s / 100, hslColor.l)
    const luminance = calculateLuminance(r, g, b)

    if (luminance < 0.6) {
      hslColor.l += 0.15
    } else if (luminance > 0.65) {
      hslColor.l -= 0.1
    }

    hslColor.l *= 100

    colorMappings[module.id] = {
      mode: 'hsl',
      desc: hslColor
    }

    if (module.groups && Array.isArray(module.groups)) {
      const totalChildren = module.groups.length
      for (let i = 0; i < totalChildren; i++) {
        const child = module.groups[i]
        // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
        calculateColor(child, depth + 1, hue, i, totalChildren)
      }
    }
  }

  for (let i = 0; i < data.length; i++) {
    const module = data[i]
    calculateColor(module, 0, null, i, data.length)
  }

  return colorMappings
}
