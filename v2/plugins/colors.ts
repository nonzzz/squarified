import type { ColorMappings, NativeModule, Plugin, PluginContext } from '../primitives'
import { getNodeDepth } from '../primitives'
import { decodeHLS } from '../shared'

function colorDecorator(node: NativeModule, hue: number) {
  const depth = getNodeDepth(node)
  const totalHueRange = Math.PI

  const depthHueOffset = depth + (totalHueRange / 10)
  const finalHue = hue + depthHueOffset / 2

  const saturation = 0.6 + 0.4 * Math.max(0, Math.cos(finalHue))
  const lightness = 0.5 + 0.2 * Math.max(0, Math.cos(finalHue + Math.PI * 2 / 3))

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

function evaluateColorMappingByNode(node: NativeModule, startAngle: number, sweepAngle: number) {
  const colorMappings: ColorMappings = {}
  colorMappings[node.id] = decodeHLS(colorDecorator(node, startAngle + sweepAngle / 2).desc)
  if (node.groups && Array.isArray(node.groups)) {
    for (const child of node.groups) {
      const childSweepAngle = child.weight / node.weight * sweepAngle
      Object.assign(colorMappings, evaluateColorMappingByNode(child, startAngle, childSweepAngle))
      startAngle += childSweepAngle
    }
  }

  return colorMappings
}

function colorMappings(app: PluginContext) {
  const colorMappings: ColorMappings = {}
  for (const node of app.render.data) {
    Object.assign(colorMappings, evaluateColorMappingByNode(node, 0, Math.PI * 2))
  }
  app.setRenderDecorator({ color: { mappings: colorMappings } })
}

export const color: Plugin = {
  name: 'preset:colorMappings',
  install(app) {
    colorMappings(app)
  }
}
