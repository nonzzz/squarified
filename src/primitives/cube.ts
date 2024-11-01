import { Iter, decodeColor, parseColor } from '../shared'
import { Render, easing } from '../etoile'
import { Graph } from '../etoile/graph/display'
import type { GraphStyleSheet } from '../etoile/graph/display'
import type { App, TreemapLayout } from './component'
import { InheritedCollections, RegisterModule } from './registry'

interface WhenOptions {
  time: number
  easing: typeof easing.cubicIn
}

interface AnimationContext {
  effect: <P extends Record<string, any> = GraphStyleSheet, K extends keyof P = string, V extends P[K] = P[K]>(
    prop: K,
    value: V
  ) => AnimationContext
  when: (opt: WhenOptions) => AnimationContext
  start: () => void
}

export interface CubeMethods {
  animate: ReturnType<typeof createAnimation>
}

const raf = window.requestAnimationFrame

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
        const easedProgress = easing(progress)
        switch (key) {
          case 'fill': {
            const lastColor = parseColor(last)!
            const nextColor = parseColor(next)!
            nextColor.desc.a = 0.5
            if (lastColor.mode === nextColor.mode) {
              const currentAlpha = lastColor.desc.a! + (nextColor.desc.a! - lastColor.desc.a!) * easedProgress
              nextColor.desc.a = currentAlpha
              const currentColor = decodeColor(nextColor)
              graph.style[key] = currentColor
            }
            break
          }
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

export class Cube extends RegisterModule {
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
