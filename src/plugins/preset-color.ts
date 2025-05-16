import type { ColorMappings } from '../component'
import { PI_2 } from '../etoile/native/matrix'
import type { ColorDecoratorResultHLS } from '../etoile/native/runtime'
import type { LayoutModule } from '../primitives/squarify'
import { hashCode } from '../shared'
import { definePlugin } from '../shared/plugin-driver'

export const presetColorPlugin = definePlugin({
  name: 'treemap:preset-color',
  onModuleInit(modules) {
    const colorMappings: ColorMappings = {}

    for (let i = 0; i < modules.length; i++) {
      const module = modules[i]
      assignColorMappings(colorMappings, module, Math.abs(hashCode(module.node.id)) % PI_2, 0)
    }

    return { colorMappings }
  }
})

function assignColorMappings(
  colorMappings: ColorMappings,
  module: LayoutModule,
  ancestorHue: number,
  depth: number
) {
  const hueOffset = (Math.abs(hashCode(module.node.id)) % 60) - 30
  const hue = (ancestorHue + hueOffset) % 360
  const saturation = Math.max(75 - depth * 5, 40)

  const baseLightness = 55 - depth * 3

  const color = adjustColorToComfortableForHumanEye(hue, saturation, baseLightness)
  colorMappings[module.node.id] = color

  if (module.node.isCombinedNode && module.node.originalNodes) {
    for (const combined of module.node.originalNodes) {
      colorMappings[combined.id] = color
    }
  }

  if (module.children && module.children.length) {
    const childCount = module.children.length
    for (let i = 0; i < childCount; i++) {
      const childHueOffset = 40 * i / childCount
      const childHue = (hue + childHueOffset) % 360

      assignColorMappings(
        colorMappings,
        module.children[i],
        childHue,
        depth + 1
      )
    }
  }
}

function adjustColorToComfortableForHumanEye(
  hue: number,
  saturation: number,
  lightness: number
): ColorDecoratorResultHLS {
  hue = ((hue % 360) + 360) % 360

  saturation = Math.min(Math.max(saturation, 40), 85)

  lightness = Math.min(Math.max(lightness, 35), 75)

  if (hue >= 60 && hue <= 180) {
    saturation = Math.max(saturation - 10, 40)
    lightness = Math.min(lightness + 5, 75)
  } else if (hue >= 200 && hue <= 280) {
    lightness = Math.min(lightness + 8, 75)
  } else if (hue >= 0 && hue <= 30) {
    saturation = Math.max(saturation - 5, 40)
  }
  return {
    mode: 'hsl',
    desc: { h: hue, s: saturation, l: lightness }
  }
}
