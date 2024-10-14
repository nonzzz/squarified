import type { ColorDecoratorResult, HLSColor, PaintView, RGBColor } from './interface'
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

export function defaultColorDecorator(module: Module, parent: Module | null): ColorDecoratorResult {
  return {
    mode: 'hsl',
    desc: {}
  }
}

function evaluateColorMappingByModule(module: Module, parent: Module | null, colorDecorator: PaintView['colorDecorator']) {
  const colorMappings = <ColorMappings> {}

  if (module.groups && module.groups.length) {
    for (const child of module.groups) {
      Object.assign(colorMappings, evaluateColorMappingByModule(child, module, colorDecorator))
    }
  }

  const colorMapping = colorDecorator(module, parent)

  if (module.id && colorMapping) {
    colorMappings[module.id] = decodeColor(colorMapping)
  }

  return colorMappings
}

export function handleColorMappings(data: Module[], colorDecorator: PaintView['colorDecorator']) {
  const colorMappings = <ColorMappings> {}
  for (const module of data) {
    Object.assign(colorMappings, evaluateColorMappingByModule(module, null, colorDecorator))
  }
  return colorMappings
}
