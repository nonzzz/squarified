import { asserts } from './graph'
import { Display, Graph } from './graph/display'
import { Schedule } from './schedule'

function traverse(graphs: Display[], handler: (graph: Graph) => void) {
  const len = graphs.length
  for (let i = 0; i < len; i++) {
    const graph = graphs[i]
    if (asserts.isBox(graph)) {
      traverse(graph.elements, handler)
    } else if (graph instanceof Graph) {
      handler(graph)
    }
  }
}

export const etoile = {
  Schedule,
  traverse
}
