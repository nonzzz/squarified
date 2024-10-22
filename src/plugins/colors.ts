import type { ColorMappings, NativeModule, Plugin, PluginContext } from '../primitives'
import { getNodeDepth } from '../primitives'
import { decodeHLS } from '../shared'

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
      l: Math.round(lightness * 100),
      a: 0.9
    }
  }
}

function evaluateColorMappingByNode(node: NativeModule, state: HueState) {
  const colorMappings: ColorMappings = {}
  if (node.groups && Array.isArray(node.groups)) {
    for (const child of node.groups) {
      Object.assign(colorMappings, evaluateColorMappingByNode(child, state))
    }
  }

  if (node.id) {
    colorMappings[node.id] = decodeHLS(colorDecorator(node, state).desc)
  }

  return colorMappings
}

function colorMappings(app: PluginContext) {
  const colorMappings: ColorMappings = {}
  const state: HueState = {
    hue: 0
  }
  for (const node of app.render.data) {
    Object.assign(colorMappings, evaluateColorMappingByNode(node, state))
  }
  app.setRenderDecorator({ color: { mappings: colorMappings } })
}

export const color: Plugin = {
  name: 'preset:colorMappings',
  order: 'post',
  install(app) {
    colorMappings(app)
  }
}
