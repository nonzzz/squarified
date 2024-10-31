import { Box } from './graph'
import { Display, Graph } from './graph/display'
import { Schedule } from './schedule'

function traverse(graphs: Display[], handler: (graph: Graph) => void) {
  graphs.forEach(graph => {
    if (graph instanceof Box) {
      traverse(graph.elements, handler)
    } else if (graph instanceof Graph) {
      handler(graph)
    }
  })
}

export const etoile = {
  Schedule,
  traverse
}
