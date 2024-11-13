import { Display, DisplayType } from './display'
import { asserts } from './types'

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

  destory() {
    this.elements.forEach(element => element.parent = null)
    this.elements.length = 0
  }

  get __instanceOf__(): DisplayType.Box {
    return DisplayType.Box
  }

  clone() {
    const box = new Box()
    if (this.elements.length) {
      const traverse = (elements: Display[], parent: Box) => {
        const els: Display[] = []
        const cap = elements.length
        for (let i = 0; i < cap; i++) {
          const element = elements[i]
          if (asserts.isBox(element)) {
            const box = new Box()
            box.parent = parent
            box.add(...traverse(element.elements, box))
            els.push(box)
          } else if (asserts.isGraph(element)) {
            const el = element.clone()
            el.parent = parent
            els.push(el)
          }
        }
        return els
      }
      box.add(...traverse(this.elements, box))
    }
    return box
  }
}
