import { LayoutNode, Viewport } from './types'

export class QuadNode {
  bounds: {
    x: number,
    y: number,
    width: number,
    height: number
  }
  nodes: QuadNode[] = []
  items: LayoutNode[] = []

  constructor(bounds: { x: number, y: number, width: number, height: number }) {
    this.bounds = bounds
  }

  subdivide(): void {
    const { x, y, width, height } = this.bounds
    const w = width / 2
    const h = height / 2

    this.nodes = [
      new QuadNode({ x, y, width: w, height: h }),
      new QuadNode({ x: x + w, y, width: w, height: h }),
      new QuadNode({ x, y: y + h, width: w, height: h }),
      new QuadNode({ x: x + w, y: y + h, width: w, height: h })
    ]
  }
}

export class QuadTree {
  private root: QuadNode

  constructor(width: number, height: number) {
    this.root = new QuadNode({ x: 0, y: 0, width, height })
  }

  insert(node: LayoutNode): void {
    this.insertNode(this.root, node)
  }

  private insertNode(quadNode: QuadNode, layoutNode: LayoutNode): void {
    if (quadNode.nodes.length === 0) {
      quadNode.items.push(layoutNode)
      if (quadNode.items.length > 4) {
        quadNode.subdivide()
        // 重新分配items
        quadNode.items.forEach((item) => {
          this.redistributeNode(quadNode, item)
        })
        quadNode.items = []
      }
    } else {
      this.redistributeNode(quadNode, layoutNode)
    }
  }

  queryVisible(viewport: Viewport): LayoutNode[] {
    const result: LayoutNode[] = []
    this.queryNode(this.root, viewport, result)
    return result
  }

  private queryNode(node: QuadNode, viewport: Viewport, result: LayoutNode[]): void {
    if (!this.intersects(node.bounds, viewport)) {
      return
    }

    result.push(...node.items)

    node.nodes.forEach((childNode) => {
      this.queryNode(childNode, viewport, result)
    })
  }

  private intersects(bounds: any, viewport: Viewport): boolean {
    return !(bounds.x > viewport.x + viewport.width ||
      bounds.x + bounds.width < viewport.x ||
      bounds.y > viewport.y + viewport.height ||
      bounds.y + bounds.height < viewport.y)
  }

  private redistributeNode(quadNode: QuadNode, layoutNode: LayoutNode): void {
    for (const node of quadNode.nodes) {
      if (this.intersects(node.bounds, layoutNode)) {
        this.insertNode(node, layoutNode)
        return
      }
    }
  }
}
