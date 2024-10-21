import { c2m, createTreemap, sortChildrenByKey } from '../src'
import * as preset from '../src/plugins'
import data from './data.json' assert { type: 'json' }

const root = document.querySelector('#app')!

const treemap = createTreemap()

treemap.use(preset.events).use(preset.layout).use(preset.color).use(preset.fps)

function main() {
  treemap.init(root)
  const sortedData = sortChildrenByKey(
    data.map((item) => c2m({ ...item, groups: item.stats }, 'statSize', (d) => ({ ...d, id: d.filename }))),
    'weight'
  )

  treemap.setOptions({
    data: sortedData
  })
}

main()

new ResizeObserver(() => treemap.resize()).observe(root)

// @ts-expect-error
treemap.on('click', function(a) {
  console.log(a)
})
