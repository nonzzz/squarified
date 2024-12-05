import { asserts } from '../etoile'
import { Graph } from '../etoile/graph/display'
import { raf } from '../shared'

export function applyForOpacity(graph: Graph, lastState: number, nextState: number, easedProgress: number) {
  const alpha = lastState + (nextState - lastState) * easedProgress
  if (asserts.isRect(graph)) {
    graph.style.opacity = alpha
  }
}

export interface EffectScopeContext {
  animationFrameID: number | null
}

function createEffectRun(c: EffectScopeContext) {
  return (fn: () => boolean | void) => {
    const effect = () => {
      const done = fn()
      if (!done) {
        c.animationFrameID = raf(effect)
      }
    }
    if (!c.animationFrameID) {
      c.animationFrameID = raf(effect)
    }
  }
}

function createEffectStop(c: EffectScopeContext) {
  return () => {
    if (c.animationFrameID) {
      window.cancelAnimationFrame(c.animationFrameID)
      c.animationFrameID = null
    }
  }
}

// Fill frame
export function createEffectScope() {
  const c: EffectScopeContext = {
    animationFrameID: null
  }

  const run = createEffectRun(c)
  const stop = createEffectStop(c)

  return { run, stop }
}
