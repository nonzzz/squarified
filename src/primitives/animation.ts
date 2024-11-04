import { Iter } from '../shared'
import { Rect, Render, easing } from '../etoile'
import { Graph } from '../etoile/graph/display'
import type { GraphStyleSheet } from '../etoile/graph/display'
import type { App, TreemapLayout } from './component'
import { InheritedCollections, RegisterModule } from './registry'

interface WhenOptions {
  time: number
  easing: typeof easing.cubicIn
}

export interface AnimationContext {
  effect: <P extends Record<string, any> = GraphStyleSheet, K extends keyof P = string, V extends P[K] = P[K]>(
    prop: K,
    value: V
  ) => AnimationContext
  when: (opt: WhenOptions) => AnimationContext
  start: () => void
}

export interface AnimationMethods {
  animate: ReturnType<typeof createAnimation>
}

const raf = window.requestAnimationFrame

export function applyForOpacity(graph: Graph, lastState: number, nextState: number, easedProgress: number) {
  const alpha = lastState + (nextState - lastState) * easedProgress
  if (graph instanceof Rect) {
    graph.style.opacity = alpha
  }
}

// In canvas the animation is that a series of frames are drawn on the canvas in
//  rapid succession to create the illusion of motion.

function createAnimation(treemap: TreemapLayout) {
  return (graph: Graph) => {
    let tasks: Record<string, any> = {}
    let isAnimating = false
    let startTime = 0
    const context = <AnimationContext> {
      effect,
      when,
      start
    }
    function effect(prop: string, value: string) {
      tasks[prop] = {
        next: value,
        // @ts-expect-error
        last: graph.style[prop]
      }
      return context
    }

    function when(options: WhenOptions) {
      const { time, easing } = options
      for (const { key, value } of new Iter(tasks)) {
        tasks[key] = { ...value, time, easing }
      }
      return context
    }

    function done() {
      tasks = {}
      isAnimating = false
    }

    function animate() {
      const elapsed = Date.now() - startTime
      let allTasksCompleted = true

      for (const { key, value } of new Iter(tasks)) {
        const { last, next, time, easing } = value
        const progress = Math.min(elapsed / time, 1)
        const easedProgress = easing(progress) || 0.1
        switch (key) {
          case 'opacity':
            applyForOpacity(graph, last, next, easedProgress)
            break
        }
        if (progress < 1) {
          allTasksCompleted = false
        }
      }
      if (allTasksCompleted) {
        done()
      } else {
        raf(animate)
      }
    }

    function start() {
      if (isAnimating) {
        return
      }
      isAnimating = true
      startTime = Date.now()
      raf(animate)
    }
    return context
  }
}

export class Animation extends RegisterModule {
  init(app: App, treemap: TreemapLayout, render: Render): void {
    const animation = createAnimation(treemap)
    const methods: InheritedCollections[] = [
      {
        name: 'animate',
        fn: () => animation
      }
    ]
    RegisterModule.mixin(treemap, methods)
  }
}
