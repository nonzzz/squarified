---

title: Plugins
level: 3

---

# Plugins

Squarified provide a serial of preset plugins.

- [presetColor](#preset-color)
- [presetHighlight](#preset-highlight)
- [presetDrag](#preset-drag)
- [presetContextMenu](#preset-context-menu)
- [presetScale](#preset-scale)
- [presetZoomable](#preset-zoomable)

## How to customize plugin?

squarified provide a function helper to declare a plugin.

```ts
import { definePlugin } from 'squarified'

export const plugin = definePlugin({
  name: 'plugin'
  //   ...hook
})
```

## Plugin Lifecycle Hooks

```mermaid
graph TD
    A[Component Initialization] --> B[onLoad]
    B --> C[Data Loading]
    C --> D[onModuleInit<br/>Process Module Data]
    D --> E[Rendering Complete]
    
    E --> F[DOM Event Observer]
    F --> G[onDOMEventTriggered<br/>Handle Interactions]
    
    E --> H[Viewport Size Change]
    H --> I[onResize<br/>Update Layout]
    
    E --> J[Component Destruction]
    J --> K[onDispose<br/>Cleanup Resources]
    
    classDef init fill:#e3f2fd,stroke:#1976d2,stroke-width:2px,color:#000
    classDef data fill:#e8f5e8,stroke:#388e3c,stroke-width:2px,color:#000
    classDef event fill:#fff3e0,stroke:#f57c00,stroke-width:2px,color:#000
    classDef layout fill:#fce4ec,stroke:#c2185b,stroke-width:2px,color:#000
    classDef cleanup fill:#f3e5f5,stroke:#7b1fa2,stroke-width:2px,color:#000
    classDef normal fill:#f5f5f5,stroke:#616161,stroke-width:2px,color:#000
    
    class A,C,E normal
    class B init
    class D data
    class F,G event
    class H,I layout
    class J,K cleanup
```

## Preset Color

Based on module id to generate rainbow colors.

```ts
import { createTreemap } from 'squarified'
import { presetColorPlugin } from 'squarified/plugins'

const treemap = createTreemap({
  plugins: [presetColorPlugin]
})
```

## Preset Highlight

Module highlight plugin.

```ts
import { createTreemap } from 'squarified'
import { presetHighlightPlugin } from 'squarified/plugins'

const treemap = createTreemap({
  plugins: [presetHighlightPlugin]
})
```

## preset Drag

Module dragable plugin.

```ts
import { createTreemap } from 'squarified'
import { presetDragElementPlugin } from 'squarified/plugins'

const treemap = createTreemap({
  plugins: [presetDragElementPlugin]
})
```

## preset Context Menu

Context menu plugin.

```ts
import { createTreemap } from 'squarified'
import { presetMenuPlugin } from 'squarified/plugins'

const treemap = createTreemap({
  plugins: [presetMenuPlugin]
})
```

## preset Scale

Module scale/wheel plugin.

```ts
import { createTreemap } from 'squarified'
import { presetScalePlugin } from 'squarified/plugins'

const treemap = createTreemap({
  plugins: [presetScalePlugin]
})
```

## preset Zoomable

Module zoom plugin.

```ts
import { createTreemap } from 'squarified'
import { presetZoomablePlugin } from 'squarified/plugins'

const treemap = createTreemap({
  plugins: [presetZoomablePlugin]
})
```
