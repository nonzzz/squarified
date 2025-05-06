import { RoundRect, Text } from '../etoile'
import type { RoundRectStyleOptions } from '../etoile/graph/rect'
import { Matrix2D } from '../etoile/native/matrix'

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
  if (typeof s === 'number') { return true }
  return s.charCodeAt(0) >= 48 && s.charCodeAt(0) <= 57
}

export function noop() {}

export function createRoundBlock(x: number, y: number, width: number, height: number, style?: Partial<RoundRectStyleOptions>) {
  return new RoundRect({ width, height, x, y, style: { ...style } })
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

export interface InheritedCollections<T = object> {
  name: string
  fn: (instance: T) => void
}

type MixinHelp<T extends InheritedCollections[]> = T extends [infer L, ...infer R]
  ? L extends InheritedCollections ? R extends InheritedCollections[] ? { [key in L['name']]: L['fn'] } & MixinHelp<R>
    : Record<string, never>
  : Record<string, never>
  : Record<string, never>

export function mixin<T extends AnyObject, const I extends InheritedCollections<T>[]>(app: T, methods: I) {
  methods.forEach(({ name, fn }) => {
    Object.defineProperty(app, name, {
      value: fn(app),
      writable: false
    })
  })
  // @ts-expect-error not
  return app as T & MixinHelp<I>
}

export interface InheritedCollectionsWithParamter<T = Any> {
  name: string
  fn: (instance: T) => (...args: Any[]) => Any
}

type MixinHelpWithParamater<T extends InheritedCollectionsWithParamter[]> = T extends [infer L, ...infer R]
  ? L extends InheritedCollectionsWithParamter
    ? R extends InheritedCollectionsWithParamter[] ? { [key in L['name']]: ReturnType<L['fn']> } & MixinHelpWithParamater<R>
    : Record<string, never>
  : Record<string, never>
  : Record<string, never>

export function mixinWithParams<
  T extends AnyObject,
  const M extends InheritedCollectionsWithParamter<T>[]
>(
  app: T,
  methods: M
) {
  methods.forEach(({ name, fn }) => {
    Object.defineProperty(app, name, {
      value: fn(app),
      writable: false,
      enumerable: true
    })
  })

  return app as T & MixinHelpWithParamater<M>
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
type Tail<T extends string[]> = T extends readonly [infer _, ...infer Rest] ? Rest : []

type StrJoin<T extends string[], F extends string> = T extends readonly [] ? ''
  : T extends readonly [infer FF] ? FF
  : `${F}${StrJoin<Tail<T>, T[0]>}`

export function prettyStrJoin<T extends string[]>(...s: T) {
  return s.join('') as StrJoin<T, T[0]>
}

export function isMacOS() {
  return /Mac OS X/.test(navigator.userAgent)
}

export function typedForIn<T extends NonNullable<object>>(obj: T, callback: (key: keyof T, value: T[keyof T]) => void) {
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      callback(key satisfies keyof T, obj[key satisfies keyof T])
    }
  }
}
