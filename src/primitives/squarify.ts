import type { RenderLayout } from './decorator'
import type { NativeModule } from './struct'
import { getNodeDepth } from './struct'

type Rect = { w: number; h: number; x: number; y: number }

export type LayoutModule = Partial<NativeModule> & {
  layout: [number, number, number, number]
  children: LayoutModule[]
  decorator: {
    titleHeight: number
    rectBorderRadius: number
    rectGap: number
    rectBorderWidth: number
  }
}

export function squarify(data: NativeModule[], rect: Rect, layoutDecorator: RenderLayout) {
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
    while (start < data.length) {
      let totalWeight = 0
      for (let i = start; i < data.length; i++) {
        totalWeight += data[i].weight
      }
      const shortestSide = Math.min(rect.w, rect.h)
      const aspectRatio = rect.w * rect.h / totalWeight
      let end = start
      let areaInRun = 0
      let oldWorst = 0

      // find the best split
      while (end < data.length) {
        const area = data[end].weight * aspectRatio
        const newWorst = worst(start, end, shortestSide, areaInRun + area, aspectRatio)
        if (end > start && oldWorst < newWorst) break
        areaInRun += area
        oldWorst = newWorst
        end++
      }
      const splited = Math.round(areaInRun / shortestSide)
      let areaInLayout = 0

      for (let i = start; i < end; i++) {
        const children = data[i]
        const area = children.weight * aspectRatio
        const lower = Math.round(shortestSide * areaInLayout / areaInRun)
        const upper = Math.round(shortestSide * (areaInLayout + area) / areaInRun)
        const [x, y, w, h] = rect.w >= rect.h
          ? [rect.x, rect.y + lower, splited, upper - lower]
          : [rect.x + lower, rect.y, upper - lower, splited]
        const depth = getNodeDepth(children) || 1
        const { titleAreaHeight, rectGap } = layoutDecorator
        const diff = titleAreaHeight.max / depth
        const hh = diff < titleAreaHeight.min ? titleAreaHeight.min : diff
        result.push({
          layout: [x, y, w, h],
          node: children,
          decorator: {
            ...layoutDecorator,
            titleHeight: hh
          },
          children: w > rectGap * 2 && h > (hh + rectGap)
            ? squarify(children.groups || [], {
              x: x + rectGap,
              y: y + hh,
              w: w - rectGap * 2,
              h: h - hh - rectGap
            }, layoutDecorator)
            : []
        })
        areaInLayout += area
      }

      start = end
      if (rect.w >= rect.h) {
        rect.x += splited
        rect.w -= splited
      } else {
        rect.y += splited
        rect.h -= splited
      }
    }
  }

  recursion(0, rect)

  return result
}
