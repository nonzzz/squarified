import { mixin } from 'src/shared'
import { PI_2 } from '../etoile/native/matrix'
import type { ColorDecoratorResultHLS } from '../etoile/native/runtime'
import type { ColorMappings } from '../interface'
import { definePlugin } from '../primitives/fly'
import { LayoutModule } from '../primitives/squarify'

export const colorScheme = definePlugin({
  name: 'color-scheme',
  scheme: {
    color(nodes) {
      const colorMappings: ColorMappings = {}
      let idx = 0
      for (const node of nodes) {
        assignColorMappings(colorMappings, node, 0 + (60 * idx), PI_2)
        idx++
      }

      return colorMappings
    }
  },
  handler: (app) => {
    return mixin(app, [
      {
        name: 'test',
        fn: () => {}
      }
    ])
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

function assignColorMappings(colorMappings: ColorMappings, node: LayoutModule, startAngle: number, sweepAngle: number) {
  const total = node.node.weight
  const children = node.children

  colorMappings[node.node.id] = toHSL(startAngle + sweepAngle / 2)

  for (const child of children) {
    const childAngle = child.node.weight / total * sweepAngle
    assignColorMappings(colorMappings, child, startAngle, childAngle)
    startAngle += childAngle
  }
}
