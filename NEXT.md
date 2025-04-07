# Next Architecture

Some designs worth keeping. `render engine(etoile)`and `plug-in systems (fly, aka plugin driver)`.

For better performance. Need to reduce calculation logic. Mindless calling of `ctx.drawImage` is harmful.
Maybe we to need implement a `Quad Tree` Alogrithm to improve rendering performance.

### Using hybrid rendering

Zoom (aka `scale`) usually occurs on mouse wheel events. We are using a `quad tree` algorithm to calculate what needs to be drawn. (Previously, we only created a cache for the screen canvas and repainting into the main canvas always caused OOM) I think using `quad tree` to do this can resolve this problem. And about draggable, if we enlarge the graphic and it overflow the layout, we still using `quad tree` otherwise cache the layout and repainting into main canvas.

### Finite State Machine is better

Based on the experience of v1, loose state manager isn't conducive to maintaining animation effects. Look the following code:

```ts
export const EVENT_STATES = {
  isDragging: false,
  isWheeling: false,
  isZooming: false,
  currentNode: null,
  forceDestroy: false,
  dragX: 0,
  dragY: 0
}

// action block
{
  if (EVENT_STATES.isDragging) {
    return
  }
  EVENT_STATES.isDragging = true
}

{
  if (EVENT_STATES.isDragging && EVENT_STATES.isWheeling) {
    // do logic
  }
}

// ...etc

{
  // If xzy
}
```

You might have noticed that we are using too much spaghetti code to describe state transitions from A to B, where we check if a state is matched and then decide whether to do something or not. Now look the following code.

```ts
const STATE_TRANSITIONS = {
  IDLE: ['DRAGGING', 'ZOOMING'],
  MOVE: ['IDLE'],
  DRAGGING: ['IDLE'],
  ZOOMING: ['IDLE']
}

export class StateManager {
  current: StateTransition
  constructor() {
    this.current = STATE_TRANSITION.IDLE
  }
  canTransition(state: StateTransition) {
    return STATE_TRANSITIONS[this.current].includes(state)
  }
  transition(state: StateTransition): boolean {
    if (this.canTransition(state)) {
      this.current = state
      return true
    }
    return false
  }
  reset() {
    this.current = STATE_TRANSITION.IDLE
  }
}

{
  if (this.stateManager.canTransition('DRAGGING')) {
    //   then ...
  }
}
```

### Use memory carefully

Memory is precious, so pooled memory is a good choice. Let's continue with this approach.

### Etoile

The Etoile rendering engine satisfactory for our needs, and we should maintain its core design principles. (自分で満足している)

For... Looking forward it as much as possible :)
