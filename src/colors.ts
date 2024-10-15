import type { ColorDecoratorResult, HLSColor, PaintView, RGBColor, TreemapContext } from './interface'
import type { Module } from './primitives'

export type ColorMappings = Record<string, string>

function decodeHLS(meta: HLSColor): string {
  const { h, l, s, a } = meta
  if ('a' in meta) {
    return `hsla(${h}deg, ${s}%, ${l}%, ${a})`
  }
  return `hsl(${h}deg, ${s}%, ${l}%)`
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
  const parent = this.get('parent', module)
  const depth = this.get('depth', module)
  const { weight } = module

  const totalHueRange = 360

  let baseHue = 0
  let sweepAngle = Math.PI * 2

  if (parent) {
    const parentHue = this.state.get('hue') || 0
    const parentWeight = parent.weight

    sweepAngle = (weight / parentWeight) * Math.PI * 2

    baseHue = parentHue + (sweepAngle / Math.PI * 180)
  }

  baseHue += sweepAngle

  const depthHueOffset = depth * (totalHueRange / 10)
  const finalHue = baseHue + depthHueOffset / 2

  const saturation = 0.6 + 0.4 * Math.max(0, Math.cos(finalHue))
  const lightness = 0.5 + 0.2 * Math.max(0, Math.cos(finalHue + Math.PI * 2 / 3))

  this.state.set('hue', baseHue)

  return {
    mode: 'hsl',
    desc: {
      h: finalHue,
      s: Math.round(saturation * 100),
      l: Math.round(lightness * 100),
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
