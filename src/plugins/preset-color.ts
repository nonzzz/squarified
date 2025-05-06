import type { ColorMappings } from '../component'
import { PI_2 } from '../etoile/native/matrix'
import type { ColorDecoratorResultHLS } from '../etoile/native/runtime'
import { NativeModule } from '../primitives/struct'
import { definePlugin } from '../shared/plugin-driver'

export const presetColorPlugin = definePlugin({
  name: 'treemap:preset-color',
  onModuleInit(modules) {
    const colorMappings: ColorMappings = {}
    let idx = 0
    for (const node of modules) {
      assignColorMappings(colorMappings, node, 0 + (60 * idx), PI_2)
      idx++
    }

    return { colorMappings }
  }
})

function toHSL(hueAngle: number): ColorDecoratorResultHLS {
  const saturation = 0.6 + 0.4 * Math.max(0, Math.cos(hueAngle))
  const lightness = 0.5 + 0.2 * Math.max(0, Math.cos(hueAngle + PI_2 / 3))
  return {
    mode: 'hsl',
    desc: {
      h: hueAngle * 180 / Math.PI,
      s: saturation * 100,
      l: lightness * 100
    }
  }
}

function assignColorMappings(colorMappings: ColorMappings, node: NativeModule, startAngle: number, sweepAngle: number) {
  const total = node.weight
  const children = (node.groups || []) as NativeModule[]

  colorMappings[node.id] = toHSL(startAngle + sweepAngle / 2)

  for (const child of children) {
    const childAngle = child.weight / total * sweepAngle
    assignColorMappings(colorMappings, child, startAngle, childAngle)
    startAngle += childAngle
  }
}
