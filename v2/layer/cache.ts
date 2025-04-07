export class CacheManager {
  private cache = new Map<string, ImageData>()
  private readonly capacity: number

  constructor(capacity: number = 50) {
    this.capacity = capacity
  }

  store(key: string, imageData: ImageData): void {
    if (this.cache.size >= this.capacity) {
      const oldestKey = this.cache.keys().next().value
      this.cache.delete(oldestKey)
    }
    this.cache.set(key, imageData)
  }

  retrieve(key: string): ImageData | null {
    return this.cache.get(key) || null
  }

  clear(): void {
    this.cache.clear()
  }
}
