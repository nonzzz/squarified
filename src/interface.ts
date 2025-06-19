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
