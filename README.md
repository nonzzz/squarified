# Squarified

`squarified treemap` is a mini treemap component.

![display](./data.gif)

## Usage

```ts
import { createTreemap, presetDecorator } from 'squarified'

const root = document.querySelector('#app')

const treemap = createTreemap()
treemap.use('decorator', presetDecorator)

treemap.init(root)

treemap.setOptions({ data: [] })
```

### Auth

Kanno

### LICENSE

[MIT](./LICENSE)
