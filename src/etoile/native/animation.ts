// Currently, etoile is an internal module, so we won't need too much easing functions.

export const easing = {
  linear: (k: number) => k,
  quadraticIn: (k: number) => k * k,
  quadraticOut: (k: number) => k * (2 - k),
  quadraticInOut: (k: number) => {
    if ((k *= 2) < 1) {
      return 0.5 * k * k
    }
    return -0.5 * (--k * (k - 2) - 1)
  },
  cubicIn: (k: number) => k * k * k,
  cubicOut: (k: number) => {
    if ((k *= 2) < 1) {
      return 0.5 * k * k * k
    }
    return 0.5 * ((k -= 2) * k * k + 2)
  }
}
