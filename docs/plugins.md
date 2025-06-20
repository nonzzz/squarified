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
    C --> D[onModuleInit - Process Module Data]
    D --> E[Layout Calculation]
    E --> F[onLayoutCalculated - Adjust Layout Nodes]
    F --> G[Rendering Complete]
    
    G --> H[DOM Event Observer]
    H --> I[onDOMEventTriggered - Handle Interactions]
    
    G --> J[Viewport Size Change]
    J --> K[onResize - Update Layout]
    
    G --> L[Component Destruction]
    L --> M[onDispose - Cleanup Resources]
    
    classDef init fill:#e3f2fd,stroke:#1976d2,stroke-width:2px,color:#000,padding:8px 20px
    classDef data fill:#e8f5e8,stroke:#388e3c,stroke-width:2px,color:#000,padding:8px 20px
    classDef layout fill:#e1f5fe,stroke:#0277bd,stroke-width:2px,color:#000,padding:8px 20px
    classDef event fill:#fff3e0,stroke:#f57c00,stroke-width:2px,color:#000,padding:8px 20px
    classDef resize fill:#fce4ec,stroke:#c2185b,stroke-width:2px,color:#000,padding:8px 20px
    classDef cleanup fill:#f3e5f5,stroke:#7b1fa2,stroke-width:2px,color:#000,padding:8px 20px
    classDef normal fill:#f5f5f5,stroke:#616161,stroke-width:2px,color:#000,padding:8px 20px
    
    class A,C,E,G normal
    class B init
    class D data
    class F layout
    class H,I event
    class J,K resize
    class L,M cleanup
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
