import type { ColorDecoratorResult, ColorDecoratorResultHLS, HLSColor, PaintView, RGBColor } from './interface'
import type { Module } from './primitives'
import { hashCode, perferNumeric } from './shared'

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

function assignColor(module: Module, hue: number, depth: number) {
  const colorMappings = {
    [module.label]: decodeColor(hueAngleToColor(hue, depth))
  }
  if (module.groups) {
    for (const m of module.groups) {
      Object.assign(colorMappings, assignColor(m, hue, depth + 1))
    }
    return colorMappings
  }
  return colorMappings
}

function assignHue(module: Module) {
  const { label } = module
  const arc = Math.PI * 2
  const hash = perferNumeric(label) ? (parseInt(label) / 1000) * arc : hashCode(label)
  return Math.round(Math.abs(hash) % arc)
}

function hueAngleToColor(hue: number, depth: number): ColorDecoratorResultHLS {
  const saturation = 60 - depth * 5
  const lightness = 50 + depth * 5
  return {
    mode: 'hsl',
    desc: {
      h: hue,
      s: Math.max(saturation, 30),
      l: Math.min(lightness, 70),
      a: 0.9
    }
  }
}

function defaultColorMapping(data: Module[]) {
  const colorMappings = {}
  for (const m of data) {
    Object.assign(colorMappings, assignColor(m, assignHue(m), 0))
  }
  return colorMappings
}

export function handleColorMappings(data: Module[], decorator?: PaintView['colorDecorator']) {
  if (!decorator) {
    return defaultColorMapping(data)
  }
  return {}
}
