/* eslint-disable no-use-before-define */
// preact is fine, but i won't need it for the project.

export type HTMLTag = keyof HTMLElementTagNameMap

export type ProprsWithChildren<P = unknown> = P & { children?: Child | Child[] }

export type Component<P = Any> = (props: ProprsWithChildren<P>) => VNode

export type Child = string | number | boolean | null | undefined | VNode

export type DeepOptionalProps<T> = {
  [K in keyof T]?: T[K] extends object ? DeepOptionalProps<T[K]> : T[K]
}

export type InferElement<T extends HTMLTag> = HTMLElementTagNameMap[T]

export interface VNode<P = Any> {
  type: HTMLTag | Component<P>
  props: ProprsWithChildren<P>
  children: Child[]
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

function normalizeKey(key: string): string {
  const specialCases: Record<string, string> = {
    className: 'class',
    htmlFor: 'for'
  }

  return specialCases[key] || key.replace(/[A-Z]/g, (m) => `-${m.toLowerCase()}`)
}

function renderProps(props: ProprsWithChildren<Record<string, Any>>): string {
  if (!props) { return '' }
  return Object.entries(props)
    .filter(([key]) => key !== 'children')
    .map(([key, value]) => {
      if (key === 'style' && typeof value === 'object') {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
        const style = Object.entries(value)
          // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
          .map(([k, v]) => `${normalizeKey(k)}:${v}`)
          .join(';')
        return `style="${style}"`
      }
      if (typeof value === 'boolean' && value) {
        return normalizeKey(key)
      }
      if (typeof value === 'string' || typeof value === 'number') {
        return `${normalizeKey(key)}="${value}"`
      }
      return ''
    })
    .filter(Boolean)
    .join(' ')
}

export function renderToString(node: Child): string {
  if (node == null || typeof node === 'boolean') {
    return ''
  }

  if (typeof node === 'string' || typeof node === 'number') {
    return String(node)
  }

  const { type, props, children } = node as VNode<unknown>

  if (type === Fragment) {
    return children.map(renderToString).join('')
  }

  if (typeof type === 'function') {
    return renderToString(type(props))
  }

  const propsString = renderProps(props)
  const childrenString = children.map(renderToString).join('')

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
  if (voidElements.has(type)) {
    return `<${type}${propsString ? ' ' + propsString : ''}/>`
  }

  return `<${type}${propsString ? ' ' + propsString : ''}>${childrenString}</${type}>`
}
