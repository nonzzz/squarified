import type { NativeModule } from './struct'

type Rect = { w: number; h: number; x: number; y: number }

export type LayoutModule = NativeModule & {
  layout: [number, number, number, number]
  children: LayoutModule[]
}

export function squarify(data: NativeModule[], rect: Rect) {
  const result: LayoutModule[] = []
  if (!data.length) return result

  const worst = (start: number, end: number, shortestSide: number, totalWeight: number, aspectRatio: number) => {
    const max = data[start].weight * aspectRatio
    const min = data[end].weight * aspectRatio
    return Math.max(
      shortestSide * shortestSide * max / (totalWeight * totalWeight),
      totalWeight * totalWeight / (shortestSide * shortestSide * min)
    )
  }

  const recursion = (start: number, rect: Rect) => {
  }

  return result
}
