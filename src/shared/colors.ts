export interface RGBColor {
  r: number
  g: number
  b: number
  a?: number
}

export interface HLSColor {
  h: number
  l: number
  s: number
  a?: number
}

export type ColorMode = 'rgb' | 'hsl'

export interface ColorDecoratorResultHLS {
  mode: 'hsl'
  desc: HLSColor
}

export interface ColorDecoratorResultRGB {
  mode: 'rgb'
  desc: RGBColor
}

export type ColorDecoratorResult = ColorDecoratorResultHLS | ColorDecoratorResultRGB

export function decodeHLS(meta: HLSColor): string {
  const { h, l, s, a } = meta
  if ('a' in meta) {
    return `hsla(${h}deg, ${s}%, ${l}%, ${a})`
  }
  return `hsl(${h}deg, ${s}%, ${l}%)`
}

export function decodeRGB(meta: RGBColor): string {
  const { r, g, b, a } = meta
  if ('a' in meta) {
    return `rgba(${r}, ${g}, ${b}, ${a})`
  }
  return `rgb(${r}, ${g}, ${b})`
}

export function decodeColor(meta: ColorDecoratorResult) {
  return meta.mode === 'rgb' ? decodeRGB(meta.desc) : decodeHLS(meta.desc)
}
