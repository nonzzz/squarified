import { Matrix2D } from '../etoile/native/matrix'
import type { RoundRectStyleOptions } from '../etoile/graph/rect'
import { RoundRect, Text } from '../etoile'

export function hashCode(str: string) {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    const code = str.charCodeAt(i)
    hash = (hash << 5) - hash + code
    hash = hash & hash
  }
  return hash
}

// For strings we only check the first character to determine if it's a number (I think it's enough)
export function perferNumeric(s: string | number) {
  if (typeof s === 'number') return true
  return s.charCodeAt(0) >= 48 && s.charCodeAt(0) <= 57
}

export function noop() {}

export function createFillBlock(x: number, y: number, width: number, height: number, style?: Partial<RoundRectStyleOptions>) {
  return new RoundRect({ width, height, x, y, style })
}

export function createTitleText(text: string, x: number, y: number, font: string, color: string) {
  return new Text({
    text,
    x,
    y,
    style: { fill: color, textAlign: 'center', baseline: 'middle', font, lineWidth: 1 }
  })
}

export const raf = window.requestAnimationFrame

export function createCanvasElement() {
  return document.createElement('canvas')
}

export function applyCanvasTransform(ctx: CanvasRenderingContext2D, matrix: Matrix2D, dpr: number) {
  ctx.setTransform(matrix.a * dpr, matrix.b * dpr, matrix.c * dpr, matrix.d * dpr, matrix.e * dpr, matrix.f * dpr)
}

export interface InheritedCollections<T = {}> {
  name: string
  fn: (instance: T) => void
}

export function mixin<T>(app: T, methods: InheritedCollections<T>[]) {
  methods.forEach(({ name, fn }) => {
    Object.defineProperty(app, name, {
      value: fn(app),
      writable: false
    })
  })
}
