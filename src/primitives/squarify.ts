import { perferNumeric } from '../shared'
import type { Module, Rect, SquarifiedModuleWithLayout } from './interface'

type LayoutRect = Rect & Partial<{ x: number; y: number }>

const STYLES = {
  PADDING: 5,
  HEAD_HEIGHT: 20,
  INSET_X: 10,
  INSET_Y: 20 + 5,
  DOT_CHAR_CODE: 46,
  ANIMATION_DURATION: 300
}

// This is a classical squarify algorithm implementation
// No  DSS (Depth-First Search Squarify) algorithm
// https://www.win.tue.nl/~vanwijk/stm.pdf (Page 5)
// Accept a sorted data (SquariiedModule) and rect (no need x, y)
export function squarify(data: Module[], userRect: LayoutRect) {
  const rect = { x: 0, y: 0, ...userRect }

  const result: SquarifiedModuleWithLayout[] = []

  if (!data.length) return result

  const worst = (start: number, end: number, shortestSide: number, totalWeight: number, aspectRatio: number) => {
    const max = data[start].weight * aspectRatio
    const min = data[end].weight * aspectRatio
    return Math.max(
      shortestSide * shortestSide * max / (totalWeight * totalWeight),
      totalWeight * totalWeight / (shortestSide * shortestSide * min)
    )
  }

  const recursion = (start: number, rect: Required<LayoutRect>) => {
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
        result.push({
          layout: [x, y, w, h],
          node: children,
          children: w > STYLES.INSET_X && h > STYLES.INSET_Y
            ? squarify(children?.groups || [], {
              x: x + STYLES.PADDING,
              y: y + STYLES.HEAD_HEIGHT,
              w: w - STYLES.INSET_X,
              h: h - STYLES.INSET_Y
            })
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

export function sortChildrenByKey<T extends Module, K extends keyof T = 'weight'>(data: T[], ...keys: K[]) {
  return data.sort((a, b) => {
    for (const key of keys) {
      const v = a[key]
      const v2 = b[key]
      if (perferNumeric(v) && perferNumeric(v2)) {
        if (v2 > v) return 1
        if (v2 < v) return -1
        continue
      }
      // Not numeric, compare as string
      const comparison = ('' + v).localeCompare('' + v2)
      if (comparison !== 0) return comparison
    }
    return 0
  })
}

export function c2m<T extends Module, K extends keyof T>(data: T, key: K, modifier?: (data: T) => T) {
  if (Array.isArray(data.groups)) {
    data.groups = sortChildrenByKey(data.groups.map(d => c2m(d as T, key as string, modifier)), 'weight')
  }
  const obj = { ...data, weight: data[key] }
  if (modifier) return modifier(obj)
  return obj
}

export function flatten<T extends Module>(data: T[]) {
  const result: Omit<T, 'groups'>[] = []
  for (let i = 0; i < data.length; i++) {
    const { groups, ...rest } = data[i]
    result.push(rest)
    if (groups) {
      // @ts-expect-error
      result.push(...flatten(groups))
    }
  }
  return result
}
