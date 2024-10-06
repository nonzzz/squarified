import type { Module, SquarifedModule } from './interface'

// Steps:
// 1. pass a sorted array of SquarifedModule
export function squarify(data: SquarifedModule[]) {
  //   const { sort = true } = options
}

function perferNumeric(s: string | number) {
  if (typeof s === 'number') return true
  return s.charCodeAt(0) >= 48 && s.charCodeAt(0) <= 57
}

export function sortChildrenByKey<T extends Module, K extends keyof T = 'weight'>(data: T[], ...keys: K[]) {
  return data.sort((a, b) => {
    for (const key of keys) {
      const v = a[key]
      const v2 = b[key]
      if (perferNumeric(v) && perferNumeric(v2)) {
        if (v > v2) return 1
        if (v < v2) return -1
        continue
      }
      // Not numeric, compare as string
      const comparison = ('' + v).localeCompare('' + v2)
      if (comparison !== 0) return comparison
    }
    return 0
  })
}

export function c2m<T extends Module, K extends keyof T>(data: T, key: K) {
  if (Array.isArray(data.groups)) {
    data.groups = sortChildrenByKey(data.groups.map(d => c2m(d, key as string)), 'weight')
  }
  return { ...data, weight: data[key] }
}

export function flatten<T extends Module>(data: T[]) {
  const result: Omit<T, 'groups'>[] = []
  for (let i = 0; i < data.length; i++) {
    const { groups, ...rest } = data[i]
    result.push(rest)
    if (groups) {
      // @ts-expect-error
      result.push(...flatten(groups))
    }
  }
  return result
}
