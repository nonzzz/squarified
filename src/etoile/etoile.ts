import { asserts } from './graph'
import { Display, S } from './graph/display'

export function traverse(graphs: Display[], handler: (graph: S) => void) {
  const len = graphs.length
  for (let i = 0; i < len; i++) {
    const graph = graphs[i]
    if (asserts.isGraph(graph)) {
      handler(graph)
    } else if (asserts.isBox(graph)) {
      traverse(graph.elements, handler)
    }
  }
}

// https://jhildenbiddle.github.io/canvas-size/#/?id=maxheight
function getCanvasBoundarySize() {
  const ua = navigator.userAgent
  let size = 16384

  if (/Firefox\/(\d+)/.test(ua)) {
    const version = parseInt(RegExp.$1, 10)
    if (version >= 122) {
      size = 23168
    } else {
      size = 11180
    }
  }

  return { size }
}

export const canvasBoundarySize = getCanvasBoundarySize()
