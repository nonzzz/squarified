import { createTreemap } from '../src'
import { c2m, sortChildrenByKey } from '../src/primitives'
import data from './data.json' assert { type: 'json' }

const root = document.querySelector('#app')!

const treemap = createTreemap()

function main() {
  treemap.init(root)
  const sortedData = sortChildrenByKey(
    data.map((item) => c2m({ ...item, groups: item.stats }, 'statSize', (d) => ({ ...d, id: d.filename }))),
    'weight'
  )
  treemap.setOptions({ data: sortedData })
}

new ResizeObserver(() => treemap.resize()).observe(root)

main()
