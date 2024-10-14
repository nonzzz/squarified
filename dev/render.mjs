import { createTreemap } from '../dist/index.mjs'
import { c2m, sortChildrenByKey } from '../dist/primitives/index.mjs'
import data from './data.json' assert { type: 'json' }

const root = document.querySelector('#app')

const treemap = createTreemap()

function main() {
  treemap.init(root)
  const sortedData = sortChildrenByKey(
    data.map((item) => c2m({ ...item, groups: item.stats }, 'statSize')),
    'weight'
  )
  treemap.setOptions({ data: sortedData })
}

main()
