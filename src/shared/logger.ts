export const createLogger = (namespace: string) => {
  return {
    error: (message: string) => {
      return console.error(`[${namespace}] ${message}`)
    },
    panic: (message: string) => {
      throw new Error(`[${namespace}] ${message}`)
    }
  }
}

export function assertExists<T>(value: T | null | undefined, logger: ReturnType<typeof createLogger>, message: string): asserts value is T {
  if (value === null || value === undefined) {
    logger.panic(message)
  }
}
