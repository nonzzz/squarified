import type { ColorDecoratorResult, HLSColor, PaintView, RGBColor, TreemapContext } from './interface'
import type { Module } from './primitives'

export type ColorMappings = Record<string, string>

function decodeHLS(meta: HLSColor): string {
  const { h, l, s, a } = meta
  if ('a' in meta) {
    return `hsla(${h}, ${s}%, ${l}%, ${a})`
  }
  return `hsl(${h}, ${s}%, ${l}%)`
}

function decodeRGB(meta: RGBColor): string {
  const { r, g, b, a } = meta
  if ('a' in meta) {
    return `rgba(${r}, ${g}, ${b}, ${a})`
  }
  return `rgb(${r}, ${g}, ${b})`
}

function decodeColor(meta: ColorDecoratorResult) {
  return meta.mode === 'rgb' ? decodeRGB(meta.desc) : decodeHLS(meta.desc)
}

// The default color decorator is based on hsla. (Graient Color)
export function defaultColorDecorator(this: TreemapContext, module: Module): ColorDecoratorResult {
  const depth = this.get('depth', module)
  return {
    mode: 'hsl',
    desc: {
      h: depth ? (depth * 35) % 360 : 0,
      s: 70,
      l: 50,
      a: 0.9
    }
  }
}

function evaluateColorMappingByModule(module: Module, colorDecorator: PaintView['colorDecorator']) {
  const colorMappings = <ColorMappings> {}

  if (module.groups && module.groups.length) {
    for (const child of module.groups) {
      Object.assign(colorMappings, evaluateColorMappingByModule(child, colorDecorator))
    }
  }

  const colorMapping = colorDecorator(module)

  if (module.id && colorMapping) {
    colorMappings[module.id] = decodeColor(colorMapping)
  }

  return colorMappings
}

export function handleColorMappings(this: TreemapContext, data: Module[], colorDecorator: PaintView['colorDecorator']) {
  const colorMappings = <ColorMappings> {}
  for (const module of data) {
    Object.assign(colorMappings, evaluateColorMappingByModule(module, colorDecorator.bind(this)))
  }
  return colorMappings
}
