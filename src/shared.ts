export class Iter<T extends Record<string, unknown>> {
  private keys: string[]
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
