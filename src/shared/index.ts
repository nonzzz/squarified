import type { RectStyleOptions } from '../etoile/graph/rect'
import { Rect, Text } from '../etoile'

export class Iter<T extends NonNullable<Record<string, any>>> {
  private keys: (keyof T)[]
  private data: T
  constructor(data: T) {
    this.data = data
    this.keys = Object.keys(data)
  }

  // dprint-ignore
  * [Symbol.iterator]() {
        for (let i = 0; i < this.keys.length; i++) {
          yield {
            key: this.keys[i],
            value: this.data[this.keys[i]] as T[keyof T],
            index: i,
            peek: () => this.keys[i + 1]
          }
        }
      }
}

export function isObject(data: NonNullable<Record<string, any>>): data is object {
  return Object.prototype.toString.call(data) === '[object Object]'
}

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

export function replaceString<S extends string, From extends string, To extends string>(str: S, searchValue: From, replaceValue: To) {
  return str.replace(searchValue, replaceValue) as S extends `${infer L}${From extends '' ? never : From}${infer R}` ? `${L}${To}${R}`
    : S
}

export function createFillBlock(x: number, y: number, width: number, height: number, style?: Partial<RectStyleOptions>) {
  return new Rect({ width, height, x, y, style })
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
