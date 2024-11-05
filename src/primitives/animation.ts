import { Rect } from '../etoile'
import { Graph } from '../etoile/graph/display'

export function applyForOpacity(graph: Graph, lastState: number, nextState: number, easedProgress: number) {
  const alpha = lastState + (nextState - lastState) * easedProgress
  if (graph instanceof Rect) {
    graph.style.opacity = alpha
  }
}
