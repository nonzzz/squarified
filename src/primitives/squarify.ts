import type { GraphicLayout } from '../interface'
import { hashCode } from '../shared'
import type { NativeModule } from './struct'
import { getNodeDepth } from './struct'

export type Rect = { w: number, h: number, x: number, y: number }

export type SquarifiedModule =
  & NativeModule
  & {
    parent: SquarifiedModule | null,
    groups: SquarifiedModule[],
    isCombinedNode?: boolean,
    originalNodeCount?: number,
    originalNodes?: SquarifiedModule[]
  }

export interface LayoutModule {
  node: SquarifiedModule
  layout: [number, number, number, number]
  children: LayoutModule[]
  config: {
    titleAreaHeight: number,
    rectGap: number,
    rectRadius: number
  }
}

function generateStableCombinedNodeId(weight: number, nodes: SquarifiedModule[]) {
  const name = nodes.map((node) => node.id).sort().join('-')
  return Math.abs(hashCode(name)) + '-' + weight
}

function processSquarifyData(
  data: SquarifiedModule[],
  totalArea: number,
  minNodeSize: number,
  minNodeArea: number
) {
  if (!data || !data.length) { return [] }

  const totalWeight = data.reduce((sum, node) => sum + node.weight, 0)

  if (totalWeight <= 0) {
    return []
  }

  const processedNodes: SquarifiedModule[] = []
  const tooSmallNodes: SquarifiedModule[] = []

  data.forEach((node) => {
    const nodeArea = (node.weight / totalWeight) * totalArea
    const estimatedSize = Math.sqrt(nodeArea)

    if (estimatedSize < minNodeSize || nodeArea < minNodeArea) {
      tooSmallNodes.push({ ...node })
    } else {
      processedNodes.push({ ...node })
    }
  })

  if (tooSmallNodes.length > 0) {
    const combinedWeight = tooSmallNodes.reduce((sum, node) => sum + node.weight, 0)

    if (combinedWeight > 0 && (combinedWeight / totalWeight * totalArea) >= minNodeArea) {
      const combinedNode: SquarifiedModule = {
        id: `combined-node-${generateStableCombinedNodeId(combinedWeight, tooSmallNodes)}`,
        weight: combinedWeight,
        isCombinedNode: true,
        originalNodeCount: tooSmallNodes.length,
        // @ts-expect-error fixme
        parent: null,
        groups: [] as SquarifiedModule[],
        originalNodes: tooSmallNodes
      }

      processedNodes.push(combinedNode)
    }
  }

  return processedNodes
}

export function squarify(data: NativeModule[], rect: Rect, config: Required<GraphicLayout>, scale = 1) {
  const result: LayoutModule[] = []
  if (!data.length) { return result }

  const totalArea = rect.w * rect.h
  const containerSize = Math.min(rect.w, rect.h)
  const scaleFactor = Math.max(0.5, Math.min(1, containerSize / 800))

  const baseMinSize = 20
  const minRenderableSize = Math.max(
    8,
    baseMinSize / Math.sqrt(scale)
  )

  const minRenderableArea = minRenderableSize * minRenderableSize

  const scaledGap = config.rectGap * scaleFactor
  const scaledRadius = config.rectRadius * scaleFactor

  const processedData = processSquarifyData(data, totalArea, minRenderableSize, minRenderableArea)

  if (!processedData.length) { return result }

  let workingRect = rect
  if (scaledGap > 0) {
    workingRect = {
      x: rect.x + scaledGap / 2,
      y: rect.y + scaledGap / 2,
      w: Math.max(0, rect.w - scaledGap),
      h: Math.max(0, rect.h - scaledGap)
    }
  }

  const worst = (start: number, end: number, shortestSide: number, totalWeight: number, aspectRatio: number) => {
    const max = processedData[start].weight * aspectRatio
    const min = processedData[end].weight * aspectRatio
    return Math.max(
      shortestSide * shortestSide * max / (totalWeight * totalWeight),
      totalWeight * totalWeight / (shortestSide * shortestSide * min)
    )
  }

  const recursion = (start: number, rect: Rect, depth: number = 0) => {
    const depthFactor = Math.max(0.4, 1 - (depth * 0.15))
    const currentGap = scaledGap * depthFactor
    const currentRadius = scaledRadius * depthFactor

    while (start < processedData.length) {
      let totalWeight = 0
      for (let i = start; i < processedData.length; i++) {
        totalWeight += processedData[i].weight
      }
      const shortestSide = Math.min(rect.w, rect.h)
      const aspectRatio = rect.w * rect.h / totalWeight
      let end = start
      let areaInRun = 0
      let oldWorst = 0
      while (end < processedData.length) {
        const area = processedData[end].weight * aspectRatio || 0
        const newWorst = worst(start, end, shortestSide, areaInRun + area, aspectRatio)
        if (end > start && oldWorst < newWorst) { break }
        areaInRun += area
        oldWorst = newWorst
        end++
      }

      const splited = Math.round(areaInRun / shortestSide)
      let areaInLayout = 0

      const isHorizontalLayout = rect.w >= rect.h

      for (let i = start; i < end; i++) {
        const isFirst = i === start
        const isLast = i === end - 1
        const children = processedData[i]
        const area = children.weight * aspectRatio

        const lower = Math.round(shortestSide * areaInLayout / areaInRun)
        const upper = Math.round(shortestSide * (areaInLayout + area) / areaInRun)

        let x, y, w, h
        if (isHorizontalLayout) {
          x = rect.x
          y = rect.y + lower
          w = splited
          h = upper - lower
        } else {
          x = rect.x + lower
          y = rect.y
          w = upper - lower
          h = splited
        }

        if (currentGap > 0) {
          const edgeGap = currentGap / 2

          if (!isFirst) {
            if (isHorizontalLayout) {
              y += edgeGap
              h = Math.max(0, h - edgeGap)
            } else {
              x += edgeGap
              w = Math.max(0, w - edgeGap)
            }
          }

          if (!isLast) {
            if (isHorizontalLayout) {
              h = Math.max(0, h - edgeGap)
            } else {
              w = Math.max(0, w - edgeGap)
            }
          }
        }

        const nodeDepth = getNodeDepth(children) || 1
        const { titleAreaHeight } = config
        const diff = titleAreaHeight.max / nodeDepth
        const titleHeight = diff < titleAreaHeight.min ? titleAreaHeight.min : diff

        w = Math.max(1, w)
        h = Math.max(1, h)

        let childrenLayout: LayoutModule[] = []

        const hasValidChildren = children.groups && children.groups.length > 0

        if (hasValidChildren) {
          const childGapOffset = currentGap > 0 ? currentGap : 0
          const childRect = {
            x: x + childGapOffset,
            y: y + titleHeight,
            w: Math.max(0, w - childGapOffset * 2),
            h: Math.max(0, h - titleHeight - childGapOffset)
          }

          const minChildSize = currentRadius > 0 ? currentRadius * 2 : 1
          if (childRect.w >= minChildSize && childRect.h >= minChildSize) {
            childrenLayout = squarify(
              children.groups || [],
              childRect,
              { ...config, rectGap: currentGap, rectRadius: currentRadius },
              scale
            )
          }
        }

        result.push({
          layout: [x, y, w, h],
          node: children,
          children: childrenLayout,
          config: {
            titleAreaHeight: titleHeight,
            rectGap: currentGap,
            rectRadius: currentRadius
          }
        })

        areaInLayout += area
      }

      start = end

      const rectGapOffset = currentGap > 0 ? currentGap : 0
      if (isHorizontalLayout) {
        rect.x += splited + rectGapOffset
        rect.w = Math.max(0, rect.w - splited - rectGapOffset)
      } else {
        rect.y += splited + rectGapOffset
        rect.h = Math.max(0, rect.h - splited - rectGapOffset)
      }
    }
  }

  recursion(0, workingRect)
  return result
}
