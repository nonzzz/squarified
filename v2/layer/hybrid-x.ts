import { c2m, defaultLayoutOptions, sortChildrenByKey } from '../../src'
import { squarify } from '../../src/primitives/squarify'
import { CacheManager } from './cache'
import { QuadTree } from './quad'
import { LayoutNode, RenderOptions, Viewport } from './types'

export class HybridRenderer {
  private quadTree: QuadTree
  private cache: CacheManager
  private ctx: CanvasRenderingContext2D
  private viewport: Viewport
  private options: RenderOptions

  constructor(
    ctx: CanvasRenderingContext2D,
    viewport: Viewport,
    options: RenderOptions
  ) {
    this.ctx = ctx
    this.viewport = viewport
    this.options = options
    this.quadTree = new QuadTree(viewport.width, viewport.height)
    this.cache = new CacheManager(options.cacheSize)
  }

  render(nodes: LayoutNode[]): void {
    if (this.shouldUseQuadTree(nodes)) {
      this.renderWithQuadTree(nodes)
    } else {
      this.renderWithCache(nodes)
    }
  }

  private shouldUseQuadTree(nodes: LayoutNode[]): boolean {
    return nodes.length > this.options.threshold ||
      this.viewport.scale > 1.5
  }

  private renderWithQuadTree(nodes: LayoutNode[]): void {
    // 重建四叉树
    this.quadTree = new QuadTree(this.viewport.width, this.viewport.height)
    nodes.forEach((node) => this.quadTree.insert(node))

    // 获取可见节点
    const visibleNodes = this.quadTree.queryVisible(this.viewport)

    // 渲染可见节点
    this.ctx.save()
    this.ctx.scale(this.viewport.scale, this.viewport.scale)
    this.ctx.translate(-this.viewport.x, -this.viewport.y)

    visibleNodes.forEach((node) => {
      if (node.width * this.viewport.scale < this.options.minNodeSize) {
        return
      }
      this.drawNode(node)
    })

    this.ctx.restore()
  }

  private renderWithCache(nodes: LayoutNode[]): void {
    const cacheKey = this.getCacheKey()
    const cached = this.cache.retrieve(cacheKey)

    if (cached) {
      this.ctx.putImageData(cached, 0, 0)
      return
    }

    // 渲染所有节点
    nodes.forEach((node) => this.drawNode(node))

    // 缓存结果
    const imageData = this.ctx.getImageData(0, 0, this.viewport.width, this.viewport.height)
    this.cache.store(cacheKey, imageData)
  }

  private drawNode(node: LayoutNode): void {
    // this.ctx.fillStyle =

    function randomColor() {
      const letters = '0123456789ABCDEF'
      let color = '#'
      for (let i = 0; i < 6; i++) {
        color += letters[Math.floor(Math.random() * 16)]
      }
      return color
    }

    this.ctx.fillStyle = randomColor()
    const n = node.layout
    this.ctx.fillRect(n[0], n[1], n[2], n[3])

    // Draw text if needed
    // if (node.data?.text) {
    //   this.drawText(node)
    // }
  }

  private drawText(node: LayoutNode): void {
    const text = node.data?.text || 'xzy'
    this.ctx.save()
    this.ctx.fillStyle = '#fff'
    this.ctx.font = '12px Arial'
    this.ctx.textBaseline = 'middle'
    this.ctx.textAlign = 'center'

    const x = node.x + node.width / 2
    const y = node.y + node.height / 2

    this.ctx.fillText(text, x, y)
    this.ctx.restore()
  }

  private getCacheKey(): string {
    return `${this.viewport.x}-${this.viewport.y}-${this.viewport.scale}`
  }

  updateViewport(viewport: Viewport): void {
    this.viewport = viewport
  }
}

async function main() {
  const app = document.getElementById('app')
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')!

  app?.appendChild(canvas)
  const { width, height } = app?.getBoundingClientRect()
  canvas.width = width
  canvas.height = height
  canvas.style.width = `${width}px`
  canvas.style.height = `${height}px`

  const viewport: Viewport = {
    x: 0,
    y: 0,
    width,
    height,
    scale: 1
  }

  const options: RenderOptions = {
    threshold: 1000, // 超过1000个节点使用四叉树
    batchSize: 100, // 批处理大小
    cacheSize: 50, // 缓存大小
    minNodeSize: 4 // 最小可见节点大小
  }

  function loadData() {
    return fetch('data.json').then((res) => res.json()).then((data: Any[]) => data)
  }

  const data = await loadData()
  const sortedData = sortChildrenByKey(
    data.map((item) => c2m({ ...item, groups: item.children }, 'value', (d) => ({ ...d, id: d.path, label: d.name }))),
    'weight'
  )

  const layoutNodes = squarify(sortedData, { w: viewport.width, h: viewport.height, x: 0, y: 0 }, defaultLayoutOptions)

  const renderer = new HybridRenderer(ctx, viewport, options)

  // 渲染数据
  renderer.render(layoutNodes)

  // 更新视口
  canvas.addEventListener('wheel', (e) => {
    viewport.scale += e.deltaY * 0.001
    viewport.scale = Math.max(0.1, Math.min(5, viewport.scale))
    console.log(viewport.scale)
    renderer.updateViewport(viewport)
    renderer.render(layoutNodes)
  })
}

main()
