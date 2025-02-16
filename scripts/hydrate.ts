import { type VNode, processVNode } from './h'

export function hydrate(rootNode: VNode) {
  const { refMap } = processVNode(rootNode)

  return { refMap }
}
