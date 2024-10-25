import { Display } from './display'

export class Box extends Display {
  elements: Display[]

  constructor() {
    super()
    this.elements = []
  }

  add(...elements: Display[]) {
    const cap = elements.length
    for (let i = 0; i < cap; i++) {
      const element = elements[i]
      if (element.parent) {
        // todo
      }
      this.elements.push(element)
      element.parent = this
    }
  }

  remove(...elements: Display[]) {
    const cap = elements.length
    for (let i = 0; i < cap; i++) {
      for (let j = this.elements.length - 1; j >= 0; j--) {
        const element = this.elements[j]
        if (element.id === elements[i].id) {
          this.elements.splice(j, 1)
          element.parent = null
        }
      }
    }
  }
}
