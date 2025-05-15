function createOnZoom(treemap: TreemapLayout, evt: TreemapEvent) {
  return (node: LayoutModule) => {
    treemap.renderCache.destroy()
    evt.state.isZooming = true
    const c = treemap.render.canvas
    const boundingClientRect = c.getBoundingClientRect()
    if (node) {
      const [mx, my, mw, mh] = node.layout
      const factor = Math.min(boundingClientRect.width / mw, boundingClientRect.height / mh)
      const targetScale = factor * evt.matrix.a
      const translateX = (boundingClientRect.width / 2) - (mx + mw / 2) * factor
      const translateY = (boundingClientRect.height / 2) - (my + mh / 2) * factor
      smoothFrame((progress, cleanup) => {
        cleanup()
        evt.silent('mousemove')
        evt.exposedEvent.silent('mousemove')
        treemap.fontCache.flush(treemap, evt.matrix)
        const easedProgress = easing.cubicInOut(progress)
        const scale = (targetScale - evt.matrix.a) * easedProgress
        evt.matrix.a += scale
        evt.matrix.d += scale
        evt.matrix.translation((translateX - evt.matrix.e) * easedProgress, (translateY - evt.matrix.f) * easedProgress)
        resetLayout(
          treemap,
          treemap.render.canvas.width * evt.matrix.a / treemap.render.options.devicePixelRatio,
          treemap.render.canvas.height * evt.matrix.d / treemap.render.options.devicePixelRatio
        )
        stackMatrixTransformWithGraphAndLayer(treemap.elements, evt.matrix.e, evt.matrix.f, 1)
        treemap.update()
      }, {
        duration: ANIMATION_DURATION,
        onStop: () => {
          evt.state.isZooming = false
          evt.active('mousemove')
          evt.exposedEvent.active('mousemove')
        }
      })
    }
  }
}
