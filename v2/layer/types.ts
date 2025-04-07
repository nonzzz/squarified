export interface Viewport {
  x: number
  y: number
  width: number
  height: number
  scale: number
}

export interface RenderOptions {
  threshold: number
  batchSize: number
  cacheSize: number
  minNodeSize: number
}

export interface LayoutNode {
  id: string
  x: number
  y: number
  width: number
  height: number
  data: Any
  children?: LayoutNode[]
}
