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
  mode?: 'hsl'
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

export function parseColor(s: string): ColorDecoratorResult | null {
  const hslRegex = /hsla?\(\s*(\d+(\.\d+)?)(deg)?,\s*(\d+(\.\d+)?%)?,\s*(\d+(\.\d+)?%)?(,\s*(\d+(\.\d+)?))?\s*\)/
  const rgbRegex = /rgba?\(\s*(\d+),\s*(\d+),\s*(\d+)(,\s*(\d+(\.\d+)?))?\s*\)/

  let match = hslRegex.exec(s)
  if (match) {
    const h = parseFloat(match[1])
    const s = parseFloat(match[4])
    const l = parseFloat(match[6])
    const a = match[8] ? parseFloat(match[8]) : 1
    return { mode: 'hsl', desc: { h, s, l, a } }
  }

  match = rgbRegex.exec(s)
  if (match) {
    const r = parseInt(match[1], 10)
    const g = parseInt(match[2], 10)
    const b = parseInt(match[3], 10)
    const a = match[5] ? parseFloat(match[5]) : 1
    return { mode: 'rgb', desc: { r, g, b, a } }
  }

  return null
}
