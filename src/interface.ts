export type Series<T> = {
  max: T,
  min: T
}

export interface GraphicLayout {
  rectRadius?: number
  rectGap?: number
  titleAreaHeight?: Series<number>
}

export interface GraphicConfig {
  layout?: GraphicLayout
}
