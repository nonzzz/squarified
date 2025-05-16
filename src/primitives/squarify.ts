import type { GraphicLayout } from '../interface'
import { hashCode } from '../shared'
import type { NativeModule } from './struct'
import { getNodeDepth } from './struct'

type Rect = { w: number, h: number, x: number, y: number }

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

function processSquarifyData(data: SquarifiedModule[], totalArea: number, minNodeSize: number, minNodeArea: number) {
  if (!data || !data.length) { return [] }

  const totalWeight = data.reduce((sum, node) => sum + node.weight, 0)
  let processedNodes: SquarifiedModule[] = []
  const tooSmallNodes: SquarifiedModule[] = []

  data.forEach((node) => {
    const nodeArea = (node.weight / totalWeight) * totalArea
    const estimatedSize = Math.sqrt(nodeArea)

    if (estimatedSize < minNodeSize || nodeArea < minNodeArea) {
      tooSmallNodes.push({ ...node })
    } else {
      if (node.groups && node.groups.length > 0) {
        const childMinSize = minNodeSize * 0.85
        const childMinArea = minNodeArea * 0.7

        const childArea = nodeArea * 0.85

        const processedGroups = processSquarifyData(node.groups, childArea, childMinSize, childMinArea)

        const cloned = { ...node }
        node.groups = processedGroups.length > 0 ? processedGroups : []
        processedNodes.push(cloned)
      } else {
        processedNodes.push({ ...node })
      }
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
    } else {
      const additionalWeightPerNode = combinedWeight / processedNodes.length
      processedNodes = processedNodes.map((node) => ({
        ...node,
        weight: node.weight + additionalWeightPerNode
      }))
    }
  }

  return processedNodes
}

export function squarify(data: NativeModule[], rect: Rect, config: Required<GraphicLayout>) {
  const result: LayoutModule[] = []
  if (!data.length) { return result }

  const totalArea = rect.w * rect.h
  const containerSize = Math.min(rect.w, rect.h)
  const scaleFactor = Math.max(0.5, Math.min(1, containerSize / 800))

  // evaluate minimum renderable size
  const minRenderableSize = Math.max(35, containerSize * 0.05)
  const minRenderableArea = minRenderableSize * minRenderableSize

  const scaledGap = config.rectGap * scaleFactor

  const scaledRadius = config.rectRadius * scaleFactor

  const processedData = processSquarifyData(data, totalArea, minRenderableSize, minRenderableArea)

  if (!processedData.length) { return result }

  rect = {
    x: rect.x + scaledGap / 2,
    y: rect.y + scaledGap / 2,
    w: rect.w - scaledGap,
    h: rect.h - scaledGap
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

        const edgeGap = currentGap / 2

        if (!isFirst) {
          if (isHorizontalLayout) {
            y += edgeGap
            h -= edgeGap
          } else {
            x += edgeGap
            w -= edgeGap
          }
        }

        if (!isLast) {
          if (isHorizontalLayout) {
            h -= edgeGap
          } else {
            w -= edgeGap
          }
        }

        const nodeDepth = getNodeDepth(children) || 1
        const { titleAreaHeight } = config
        const diff = titleAreaHeight.max / nodeDepth
        const titleHeight = diff < titleAreaHeight.min ? titleAreaHeight.min : diff

        w = Math.max(2, w)
        h = Math.max(2, h)

        let childrenLayout: LayoutModule[] = []

        const hasValidChildren = children.groups && children.groups.length > 0

        if (hasValidChildren) {
          const childRect = {
            x: x + currentGap,
            y: y + titleHeight,
            w: Math.max(0, w - currentGap * 2),
            h: Math.max(0, h - titleHeight - currentGap)
          }

          if (childRect.w > currentRadius * 2 && childRect.h > currentRadius * 2) {
            childrenLayout = squarify(
              children.groups || [],
              childRect,
              { ...config, rectGap: currentGap, rectRadius: currentRadius }
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

      if (isHorizontalLayout) {
        rect.x += splited + currentGap
        rect.w -= splited + currentGap
      } else {
        rect.y += splited + currentGap
        rect.h -= splited + currentGap
      }
    }
  }
  recursion(0, rect)
  return result
}
