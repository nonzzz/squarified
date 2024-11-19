import { c2m, createTreemap, presetDecorator, sortChildrenByKey } from '../src'

const root = document.querySelector('#app')!

const treemap = createTreemap()
treemap.use('decorator', presetDecorator)

function loadData() {
  return fetch('./data.json').then((res) => res.json()).then((data: any[]) => data)
}

async function main() {
  const data = await loadData()
  const sortedData = sortChildrenByKey(
    data.map((item) => c2m({ ...item, groups: item.stats }, 'statSize', (d) => ({ ...d, id: d.label }))),
    'weight'
  )

  treemap.setOptions({
    data: sortedData
  })
}

treemap.init(root)

main()

treemap.on('click', function(metadata) {
  // this.zoom(metadata.module)
})

new ResizeObserver(() => treemap.resize()).observe(root)

const badge = document.createElement('div')
badge.style.position = 'fixed'
badge.style.left = '20px'
badge.style.bottom = '20px'
badge.style.padding = '10px'
badge.style.backgroundColor = 'rgba(0, 0, 0, 0.7)'
badge.style.color = 'white'
badge.style.borderRadius = '5px'
badge.style.fontFamily = 'Arial, sans-serif'
badge.style.fontSize = '14px'
badge.textContent = 'FPS: 0'
document.body.appendChild(badge)
let lastFrameTime = 0
let frameCount = 0
let lastSecond = 0
function animate(currentTime: number) {
  if (lastFrameTime !== 0) {
    frameCount++
    if (currentTime - lastSecond >= 1000) {
      const fps = frameCount
      badge.textContent = `FPS: ${fps}`
      frameCount = 0
      lastSecond = currentTime
    }
  }
  lastFrameTime = currentTime
  requestAnimationFrame(animate)
}
requestAnimationFrame(animate)
