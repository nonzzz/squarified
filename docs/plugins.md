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
    C --> D[onModuleInit<br>Process Module Data]
    D --> E[Rendering Complete]
    
    E --> F{DOM Event Observer}
    F -->|wheel event| G[onDOMEventTriggered<br>Handle Interactions]
    F -->|click event| G
    F -->|mouse event| G
    F -->|other DOM events| G
    
    E --> H{Viewport Size Change}
    H --> I[onResize<br>Update Layout]
    
    E --> J{Component Destruction}
    J --> K[onDispose<br>Cleanup Resources]
    
    %% Define custom styles with better contrast
    classDef initHook fill:#c2d6ff,stroke:#333,rx:5,ry:5,color:black
    classDef dataHook fill:#c2f0d5,stroke:#333,rx:5,ry:5,color:black
    classDef eventHook fill:#ffd599,stroke:#333,rx:5,ry:5,color:black
    classDef layoutHook fill:#ffcccb,stroke:#333,rx:5,ry:5,color:black
    classDef cleanupHook fill:#e6c3e6,stroke:#333,rx:5,ry:5,color:black
    classDef normalNode fill:#f8f9fa,stroke:#333,color:black
    classDef decisionNode fill:#d8dee9,stroke:#333,rx:8,ry:8,color:black
    
    %% Apply styles to specific nodes
    class B initHook
    class D dataHook
    class G eventHook
    class I layoutHook
    class K cleanupHook
    class A,C,E normalNode
    class F,H,J decisionNode
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
