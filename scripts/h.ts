/* eslint-disable no-use-before-define */
// preact is fine, but i won't need it for the project.
// Note: This is a minimal implementation that only do jsx to html string conversion.
interface Context {
  refs: Map<string, Ref<unknown>>
  clientCallbacks: Array<{ fn: () => void, refs: string[] }>
  currentRefs: string[]
  id: symbol
}

let currentContext: Context | null = null
const contexts = new Map<symbol, Context>()

function createContext(): Context {
  return {
    refs: new Map(),
    clientCallbacks: [],
    currentRefs: [],
    id: Symbol('context')
  }
}

function withContext<T>(fn: () => T): T {
  const prevContext = currentContext
  currentContext = createContext()
  try {
    return fn()
  } finally {
    contexts.delete(currentContext.id)
    currentContext = prevContext
  }
}

export type HTMLTag = keyof HTMLElementTagNameMap

export type ProprsWithChildren<P = unknown> = P & { children?: Child | Child[], ref?: Ref<unknown> }

export type Component<P = Any> = (props: ProprsWithChildren<P>) => VNode

export type Child = string | number | boolean | null | undefined | VNode

export type DeepOptionalProps<T> = {
  [K in keyof T]?: T[K] extends object ? DeepOptionalProps<T[K]> : T[K]
}

export type InferElement<T extends HTMLTag> = HTMLElementTagNameMap[T]

export interface VNode<P = Any> {
  type: HTMLTag | Component<P> | 'svg'
  props: ProprsWithChildren<P>
  children: Child[]
  __id__?: string
}

export type JSXElement<E extends HTMLTag | Component> = E extends HTMLTag ? VNode<DeepOptionalProps<InferElement<E>>>
  : E extends Component<infer P> ? VNode<P>
  : never

export function h<T extends HTMLTag | Component>(
  type: T,
  props: T extends FragmentType ? null
    : T extends HTMLTag ? (DeepOptionalProps<InferElement<T>> | null)
    : T extends Component<infer P> ? P
    : never,
  ...children: Child[]
): JSXElement<T> {
  return {
    type,
    props: props || null,
    children: children.flat().filter(Boolean)
  } as JSXElement<T>
}

export const Fragment = Symbol('Fragment') as unknown as Component<Any>
export type FragmentType = typeof Fragment

function normalizeKey(key: string, isSvg: boolean): string {
  if (isSvg) {
    const svgSpecialCases: Record<string, string> = {
      className: 'class',
      htmlFor: 'for',
      viewBox: 'viewBox',
      fillRule: 'fill-rule',
      clipRule: 'clip-rule',
      strokeWidth: 'stroke-width',
      strokeLinecap: 'stroke-linecap',
      strokeLinejoin: 'stroke-linejoin',
      strokeDasharray: 'stroke-dasharray',
      strokeDashoffset: 'stroke-dashoffset'
    }
    return svgSpecialCases[key] || key
  }
  const specialCases: Record<string, string> = {
    className: 'class',
    htmlFor: 'for'
  }
  return specialCases[key] || key.replace(/[A-Z]/g, (m) => `-${m.toLowerCase()}`)
}

function renderProps(props: ProprsWithChildren<Record<string, Any>>, isSvg: boolean): string {
  if (!props) { return '' }
  return Object.entries(props)
    .filter(([key]) => key !== 'children')
    .map(([key, value]) => {
      if (key === 'style' && typeof value === 'object') {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
        const style = Object.entries(value)
          // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
          .map(([k, v]) => `${normalizeKey(k, isSvg)}:${v}`)
          .join(';')
        return `style="${style}"`
      }
      if (typeof value === 'boolean' && value) {
        return normalizeKey(key, isSvg)
      }
      if (typeof value === 'string' || typeof value === 'number') {
        return `${normalizeKey(key, isSvg)}="${value}"`
      }
      return ''
    })
    .filter(Boolean)
    .join(' ')
}

const SVG_NAMESPACE = 'http://www.w3.org/2000/svg'
const SVG_TAGS = new Set([
  'svg',
  'path',
  'rect',
  'circle',
  'line',
  'g',
  'defs',
  'pattern',
  'mask',
  'use',
  'polyline',
  'polygon',
  'text',
  'tspan'
])

export function renderToString(node: VNode) {
  return withContext(() => {
    const context = currentContext!
    const { vnode, refMap } = processVNode(node)
    return {
      html: processNodeToStr(vnode),
      refMap,
      onClientMethods: context.clientCallbacks
    }
  })
}

export function processNodeToStr(node: Child): string {
  if (node == null || typeof node === 'boolean') {
    return ''
  }

  if (typeof node === 'string' || typeof node === 'number') {
    return String(node)
  }

  const { type, props, children, __id__ } = node as VNode<unknown>

  const refAttr = __id__ ? `data-ref="${__id__}"` : ''

  if (type === Fragment) {
    return children.map(processNodeToStr).join('')
  }

  if (typeof type === 'function') {
    return processNodeToStr(type(props))
  }

  const isSvg = typeof type === 'string' && SVG_TAGS.has(type)

  const propsString = renderProps(props, isSvg)
  const childrenString = children.map(processNodeToStr).join('')

  // Self-closing tags
  const voidElements = new Set([
    'area',
    'base',
    'br',
    'col',
    'embed',
    'hr',
    'img',
    'input',
    'link',
    'meta',
    'param',
    'source',
    'track',
    'wbr'
  ])
  if (isSvg && type === 'svg') {
    return `<svg xmlns="${SVG_NAMESPACE}"${propsString ? ' ' + propsString : ''}${refAttr}>${childrenString}</svg>`
  }

  if (voidElements.has(type)) {
    return `<${type}${propsString ? ' ' + propsString : ''} ${refAttr}/>`
  }

  return `<${type}${propsString ? ' ' + propsString : ''} ${refAttr}>${childrenString}</${type}>`
}

export interface RefObject<T> {
  current: T | null
}

export type RefCallback<T> = (instance: T | null) => void
export type Ref<T> = RefObject<T> | RefCallback<T>

export function useRef<T>(initialValue: T | null = null): RefObject<T> {
  if (!currentContext) {
    throw new Error('useRef must be called within a component')
  }
  const id = `ref_${currentContext.refs.size}`
  const ref = { current: initialValue }
  currentContext.refs.set(id, ref)
  currentContext.currentRefs.push(id)
  return ref
}

export function processVNode(rootNode: VNode) {
  const context = currentContext!
  const refMap: Record<string, Ref<unknown>> = {}

  function processNode(node: VNode<unknown>): VNode<unknown> {
    return withContext(() => {
      if (typeof node.type === 'function') {
        const result = node.type(node.props)
        const processed = processNode(result)
        context.clientCallbacks.push(...currentContext!.clientCallbacks)
        return processed
      }

      const processedNode = { ...node }

      if (node.props?.ref) {
        const id = `ref_${Object.keys(refMap).length}`
        processedNode.__id__ = id
        refMap[id] = node.props.ref
      }

      processedNode.children = node.children.map((child) => {
        if (child && typeof child === 'object' && 'type' in child) {
          return processNode(child as VNode)
        }
        return child
      })

      return processedNode
    })
  }

  const processedVNode = processNode(rootNode)
  return { vnode: processedVNode, refMap }
}

export function onClient(callback: () => void) {
  if (!currentContext) {
    throw new Error('onClient must be called within a component')
  }
  currentContext.clientCallbacks.push({
    fn: callback,
    refs: [...currentContext.currentRefs]
  })
  currentContext.currentRefs = []
}
