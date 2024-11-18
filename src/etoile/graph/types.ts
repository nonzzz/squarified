import { Box } from './box'
import { Display, DisplayType, Graph } from './display'
import { Layer } from './layer'
import { Rect } from './rect'
import { Text } from './text'

export function isGraph(display: Display): display is Graph {
  return display.__instanceOf__ === DisplayType.Graph
}

export function isBox(display: Display): display is Box {
  return display.__instanceOf__ === DisplayType.Box
}

export function isRect(display: Display): display is Rect {
  return isGraph(display) && display.__shape__ === DisplayType.Rect
}

export function isText(display: Display): display is Text {
  return isGraph(display) && display.__shape__ === DisplayType.Text
}

export function isLayer(display: Display): display is Layer {
  return display.__instanceOf__ === DisplayType.Layer
}

export const asserts = {
  isGraph,
  isBox,
  isRect,
  isText,
  isLayer
}
