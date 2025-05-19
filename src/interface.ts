export type Series<T> = {
  max: T,
  min: T
}

export interface GraphicLayout {
  rectRadius?: number
  rectGap?: number
  titleAreaHeight?: Series<number>
}

export interface GraphicFont {
  color?: string
  fontSize?: Series<number>
  family?: string
}

export interface GraphicConfig {
  layout?: GraphicLayout
  font?: GraphicFont
}

/**
 * @deprecated `TreemapInstanceAPI` don't provide methods anymore. (will be removed in the future versions)
 * Keep it only for migration convenience
 */
export interface TreemapInstanceAPI {
  /**
   * @deprecated don't call this method anymore.
   */
  zoom: () => void
}
