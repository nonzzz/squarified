import { createTreemap } from '../dist/index.mjs'
import { c2m, sortChildrenByKey } from '../dist/primitives/index.mjs'

let treemap

const root = document.querySelector('#app')

function bindTreemapEvent() {
  return {
    mouseevent: () => {
      //
    }
  }
}

function main(data) {
  treemap = createTreemap()
  treemap.init(root)
  data = sortChildrenByKey(
    data.map((item) => c2m({ ...item, groups: item.stats }, 'statSize')),
    'weight'
  )
  treemap.setOptions({ data, evt: bindTreemapEvent() })
}

fetch('./data.json').then(r => r.json()).then((data) => main(data))
