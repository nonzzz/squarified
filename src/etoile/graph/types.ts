import { Box } from './box'
import { Display, Graph } from './display'
import { Layer } from './layer'
import { Rect, RoundRect } from './rect'
import { Text } from './text'

export const enum DisplayType {
  // eslint-disable-next-line no-unused-vars
  Graph = 'Graph',
  // eslint-disable-next-line no-unused-vars
  Box = 'Box',
  // eslint-disable-next-line no-unused-vars
  Rect = 'Rect',
  // eslint-disable-next-line no-unused-vars
  Text = 'Text',
  // eslint-disable-next-line no-unused-vars
  Layer = 'Layer',
  // eslint-disable-next-line no-unused-vars
  RoundRect = 'RoundRect'
}

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

export function isRoundRect(display: Display): display is RoundRect {
  return isGraph(display) && display.__shape__ === DisplayType.RoundRect
}

export const asserts = {
  isGraph,
  isBox,
  isRect,
  isText,
  isLayer
}
