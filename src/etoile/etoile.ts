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
