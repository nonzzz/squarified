# Squarified

A minimal and powerful treemap visualization library for creating interactive hierarchical data visualizations.

## Features

- 🚀 **Lightweight**: Minimal bundle size with maximum performance
- 🎨 **Customizable**: Rich theming and styling options
- 🔌 **Plugin System**: Extensible architecture with built-in plugins
- 📱 **Responsive**: Automatic resizing
- ⚡ **Interactive**: Built-in zoom, drag, highlight, and menu interactions
- 🎯 **TypeScript**: Full type safety and excellent DX

## Installation

```shell
npm install squarified
# or
yarn add squarified
# or
pnpm add squarified
```

## Quick Start

```typescript
import { c2m, createTreemap, sortChildrenByKey } from 'squarified'

// Create a treemap instance
const treemap = createTreemap({
  plugins: [
    // Add built-in plugins for interactions
  ]
})

// Initialize with a DOM element
const container = document.querySelector('#treemap-container')
treemap.init(container)

// Set your data
treemap.setOptions({
  data: [
    {
      id: 'root',
      label: 'Root',
      weight: 100,
      groups: [
        { id: 'child1', label: 'Child 1', weight: 60 },
        { id: 'child2', label: 'Child 2', weight: 40 }
      ]
    }
  ]
})
```

## Complete Example

```typescript
import {
  c2m,
  createTreemap,
  presetColorPlugin,
  presetDragElementPlugin,
  presetHighlightPlugin,
  presetMenuPlugin,
  presetScalePlugin,
  presetZoomablePlugin,
  sortChildrenByKey
} from 'squarified'

// Create treemap with plugins
const treemap = createTreemap({
  plugins: [
    presetColorPlugin,
    presetZoomablePlugin,
    presetHighlightPlugin,
    presetDragElementPlugin,
    presetScalePlugin(),
    presetMenuPlugin({
      style: {
        borderRadius: '5px',
        padding: '6px 12px',
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        color: 'white',
        cursor: 'pointer',
        userSelect: 'none'
      },
      render: () => [
        { html: '<span>🔍 Zoom In</span>', action: 'zoom' },
        { html: '<span>🔄 Reset</span>', action: 'reset' }
      ],
      onClick(action, module) {
        switch (action) {
          case 'zoom':
            if (module?.node.id) {
              treemap.zoom(module.node.id)
            }
            break
          case 'reset':
            treemap.resize()
            break
        }
      }
    })
  ]
})

// Convert and prepare data
async function loadData() {
  const response = await fetch('/api/data')
  const rawData = await response.json()

  // Transform data structure
  const convertedData = rawData.map((item) => ({
    ...item,
    groups: item.children?.map((child) => convertChildrenToGroups(child))
  }))

  // Convert to treemap format and sort
  const treemapData = sortChildrenByKey(
    convertedData.map((item) =>
      c2m(item, 'value', (d) => ({
        ...d,
        id: d.path,
        label: d.name
      }))
    ),
    'weight'
  )

  return treemapData
}

// Initialize
const container = document.querySelector('#app')
treemap.init(container)

// Load and set data
loadData().then((data) => {
  treemap.setOptions({ data })
})

// Handle events
treemap.on('click', (event, module) => {
  console.log('Clicked:', module?.node)
})

// Auto-resize on container changes
new ResizeObserver(() => {
  treemap.resize()
}).observe(container)
```

## API Reference

### Creating a Treemap

#### `createTreemap(options?)`

Creates a new treemap instance.

```typescript
interface CreateTreemapOptions {
  plugins?: Plugin[]
}
```

### Instance Methods

#### `init(element: HTMLElement)`

Initialize the treemap with a DOM container.

#### `setOptions(options: TreemapOptions)`

Update treemap configuration and data.

#### `resize()`

Manually trigger a resize recalculation.

#### `on(event: string, handler: Function)`

Subscribe to treemap events.

#### `dispose()`

Clean up the treemap instance.

### Data Format

```typescript
interface TreemapNode {
  id: string
  label: string
  weight: number
  groups?: TreemapNode[]
  // Custom properties...
}
```

### Utility Functions

#### `c2m(data, weightKey, transform?)`

Convert hierarchical data to treemap format.

#### `sortChildrenByKey(data, key)`

Sort treemap nodes by a specific key.

## Built-in Plugins

- **presetColorPlugin**: Automatic color assignment
- **presetZoomablePlugin**: Zoom interactions
- **presetHighlightPlugin**: Hover highlighting
- **presetDragElementPlugin**: Drag interactions
- **presetScalePlugin**: Scaling controls
- **presetMenuPlugin**: Context menus

## Browser Support

- Chrome/Edge 80+
- Firefox 75+
- Safari 13+

## Performance

Squarified is optimized for performance with:

- Canvas-based rendering
- Efficient layout algorithms
- Smart redraw optimizations
- Memory-conscious design

## Contributing

Contributions are welcome! Please read our [contributing guide](CONTRIBUTING.md) for details.

## License

[MIT](./LICENSE)

## Auth

Kanno

## Credits

Algorithm ported from [esbuild Bundle Size Analyzer](https://esbuild.github.io/analyze/) by [Evan Wallace](https://github.com/evanw), refactored and optimized for general-purpose treemap visualization.
