import esbuild from 'esbuild'
import fs from 'fs'
import fsp from 'fs/promises'
import hljs from 'highlight.js'
import yaml from 'js-yaml'
import markdownit from 'markdown-it'
import path from 'path'
import type { Component } from './h'
import { Fragment, h, onClient, renderToString } from './h'
/// <reference path="./jsx-namespace.d.ts" />

const md = markdownit({ html: true })

const Dirs = {
  docs: path.resolve(__dirname, '../docs'),
  src: path.resolve(__dirname, '../src'),
  dest: path.resolve(__dirname, '../display'),
  example: path.resolve(__dirname, '../dev'),
  script: __dirname
}

interface HeadProps {
  title: string
}

export type Theme = 'light' | 'dark'

const Icons = {
  Moon: () => (
    <svg id="theme-light" xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 256 256">
      <path
        fill="currentColor"
        d="M233.54 142.23a8 8 0 0 0-8-2a88.08 88.08 0 0
      1-109.8-109.8a8 8 0 0 0-10-10a104.84 104.84 0 0 0-52.91 37A104 104 0 0 0
      136 224a103.1 103.1 0 0 0 62.52-20.88a104.84 104.84 0 0 0 37-52.91a8 8 0
      0 0-1.98-7.98m-44.64 48.11A88 88 0 0 1 65.66 67.11a89 89 0 0 1
      31.4-26A106 106 0 0 0 96 56a104.11 104.11 0 0 0 104 104a106 106 0 0 0
      14.92-1.06a89 89 0 0 1-26.02 31.4"
      />
    </svg>
  ),
  Sun: () => (
    <svg id="theme-dark" xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 256 256">
      <path
        fill="currentColor"
        d="M120 40V16a8 8 0 0 1 16 0v24a8 8 0 0 1-16 0m72
      88a64 64 0 1 1-64-64a64.07 64.07 0 0 1 64 64m-16 0a48 48 0 1 0-48 48a48.05
      48.05 0 0 0 48-48M58.34 69.66a8 8 0 0 0 11.32-11.32l-16-16a8 8 0 0
      0-11.32 11.32Zm0 116.68l-16 16a8 8 0 0 0 11.32 11.32l16-16a8 8 0 0
      0-11.32-11.32M192 72a8 8 0 0 0 5.66-2.34l16-16a8 8 0 0 0-11.32-11.32l-16
      16A8 8 0 0 0 192 72m5.66 114.34a8 8 0 0 0-11.32 11.32l16 16a8 8 0 0 0
      11.32-11.32ZM48 128a8 8 0 0 0-8-8H16a8 8 0 0 0 0 16h24a8 8 0 0 0
      8-8m80 80a8 8 0 0 0-8 8v24a8 8 0 0 0 16 0v-24a8 8 0 0 0-8-8m112-88h-24a8
      8 0 0 0 0 16h24a8 8 0 0 0 0-16"
      />
    </svg>
  ),
  GitHub: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 256 256">
      <path
        fill="currentColor"
        d="M208.31 75.68A59.78 59.78 0 0 0 202.93 28a8 8
      0 0 0-6.93-4a59.75 59.75 0 0 0-48 24h-24a59.75 59.75 0 0 0-48-24a8 8 0 0
      0-6.93 4a59.78 59.78 0 0 0-5.38 47.68A58.14 58.14 0 0 0 56 104v8a56.06
      56.06 0 0 0 48.44 55.47A39.8 39.8 0 0 0 96 192v8H72a24 24 0 0 1-24-24a40
      40 0 0 0-40-40a8 8 0 0 0 0 16a24 24 0 0 1 24 24a40 40 0 0 0 40 40h24v16a8
      8 0 0 0 16 0v-40a24 24 0 0 1 48 0v40a8 8 0 0 0 16 0v-40a39.8 39.8 0 0
      0-8.44-24.53A56.06 56.06 0 0 0 216 112v-8a58.14 58.14 0 0 0-7.69-28.32M200
      112a40 40 0 0 1-40 40h-48a40 40 0 0 1-40-40v-8a41.74 41.74 0 0 1
      6.9-22.48a8 8 0 0 0 1.1-7.69a43.8 43.8 0 0 1 .79-33.58a43.88 43.88 0 0 1
      32.32 20.06a8 8 0 0 0 6.71 3.69h32.35a8 8 0 0 0 6.74-3.69a43.87 43.87 0 0
      1 32.32-20.06a43.8 43.8 0 0 1 .77 33.58a8.09 8.09 0 0 0 1 7.65a41.7 41.7
      0 0 1 7 22.52Z"
      />
    </svg>
  ),
  Menu: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 256 256">
      <path
        fill="#888888"
        d="M224 128a8 8 0 0 1-8 8H40a8 8 0 0 1 0-16h176a8 8 0 0 1 8 8M40 
  72h176a8 8 0 0 0 0-16H40a8 8 0 0 0 0 16m176 112H40a8 8 0 0 0 0 16h176a8 8 0 0 0 0-16"
      />
    </svg>
  )
}

type DocTagElement = 'p' | 'ul' | 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6' | 'pre' | `pre.${string}`

type DocTagValue<T extends DocTagElement> = T extends 'ul' ? string[] : string

interface FormattedDocTag<T extends DocTagElement> {
  tag: T
  value: DocTagValue<T>
}

type AnyFormattedDocTag = FormattedDocTag<DocTagElement>

interface RenderMetadata {
  title: string
  body: AnyFormattedDocTag[]
}

const target = ['chrome58', 'safari11', 'firefox57', 'edge16']

const data = yaml.load(fs.readFileSync(path.join(Dirs.docs, 'index.yaml'), 'utf8')) as Record<string, RenderMetadata | string>

const pages = Object.entries(data)

const commonCSS = minifyCSS(fs.readFileSync(path.join(Dirs.script, 'style.css'), 'utf8'))

function createTag<T extends DocTagElement>(tag: T, value: DocTagValue<T>): FormattedDocTag<T> {
  return { tag, value }
}

const formatedPages = pages.reduce((acc, [page, pageData]) => {
  if (typeof pageData === 'string') {
    if (pageData.endsWith('.yaml')) {
      pageData = yaml.load(fs.readFileSync(path.join(Dirs.docs, pageData), 'utf8')) as RenderMetadata
    }
  }
  if (typeof pageData === 'object') {
    pageData.body = pageData.body.map((sec) => {
      const tag = Object.keys(sec)[0]
      // @ts-expect-error safe
      return createTag(tag as DocTagElement, sec[tag] as DocTagValue<typeof tag>)
    })
  }
  // @ts-expect-error safe
  acc.push([page, pageData])
  return acc
}, [] as [string, RenderMetadata][])

function minifyCSS(css: string) {
  return esbuild.transformSync(css, { target, loader: 'css', minify: true }).code
}

function buildAndMinifyJS(entry: string) {
  const r = esbuild.buildSync({
    bundle: true,
    format: 'iife',
    loader: {
      '.ts': 'ts'
    },
    define: {
      LIVE_RELOAD: 'false'
    },
    minify: true,
    write: false,
    entryPoints: [entry]
  })
  if (r.outputFiles.length) {
    return r.outputFiles[0].text
  }
  throw new Error('No output files')
}

// We use github highlighting style

function pipeOriginalCSSIntoThemeSystem(css: string, theme: Theme) {
  let wrappered = ''
  if (theme === 'dark') {
    wrappered = `html[data-theme="dark"] { ${css} }\n`
  } else {
    wrappered = `html:not([data-theme="dark"]) { ${css} }\n`
  }

  return minifyCSS(wrappered)
}

const hljsPath = path.dirname(require.resolve('highlight.js/package.json', { paths: [process.cwd()] }))

const hljsGitHubCSS = {
  light: pipeOriginalCSSIntoThemeSystem(fs.readFileSync(path.join(hljsPath, 'styles/github.css'), 'utf-8'), 'light'),
  dark: pipeOriginalCSSIntoThemeSystem(fs.readFileSync(path.join(hljsPath, 'styles/github-dark.css'), 'utf-8'), 'dark')
}

export function Logo() {
  return (
    <svg
      className="logo"
      width="40"
      height="40"
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect
        x="4"
        y="4"
        width="32"
        height="32"
        rx="6"
        fill="var(--menu-bg)"
        stroke="var(--foreground-color)"
        strokeWidth="1.5"
      />
      <g>
        <rect
          x="8"
          y="8"
          width="11"
          height="11"
          fill="var(--foreground-color)"
          opacity="0.55"
        >
          <animateTransform
            attributeName="transform"
            type="scale"
            values="1;1.2;1"
            dur="3s"
            repeatCount="indefinite"
            additive="sum"
            calcMode="spline"
            keySplines="0.4 0 0.2 1; 0.4 0 0.2 1"
          />
        </rect>
        <rect
          x="21"
          y="8"
          width="11"
          height="11"
          fill="var(--foreground-color)"
          opacity="0.75"
        >
          <animate
            attributeName="width"
            values="11;8;11"
            dur="3s"
            repeatCount="indefinite"
            calcMode="spline"
            keySplines="0.4 0 0.2 1; 0.4 0 0.2 1"
          />
          <animate
            attributeName="x"
            values="21;24;21"
            dur="3s"
            repeatCount="indefinite"
            calcMode="spline"
            keySplines="0.4 0 0.2 1; 0.4 0 0.2 1"
          />
        </rect>
        <rect
          x="8"
          y="21"
          width="24"
          height="11"
          fill="var(--foreground-color)"
          opacity="0.85"
        >
          <animate
            attributeName="y"
            values="21;23;21"
            dur="2s"
            repeatCount="indefinite"
            calcMode="spline"
            keySplines="0.4 0 0.2 1; 0.4 0 0.2 1"
          />
        </rect>
      </g>
    </svg>
  )
}
function Head(props: HeadProps) {
  const { title } = props
  return (
    <head>
      <meta charSet="utf-8" />
      <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <title>squarified - {title}</title>
      <link rel="icon" type="image/svg+xml" href="/favicon.svg"></link>
      <meta property="og:type" content="website" />
      <meta property="og:title" content="squarified" />
      <meta name="og:description" content="A simple, fast, and lightweight layout algorithm for nested rectangles." />
      <style>
        {hljsGitHubCSS.light}
      </style>
      <style>
        {hljsGitHubCSS.dark}
      </style>
      <style>
        {commonCSS}
      </style>
    </head>
  )
}

function toID(text: string) {
  return text.trim().toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]+/g, '')
}

interface HeadingBase {
  value: string
  id: string
}

interface HeadingMetadata extends HeadingBase {
  h3s: HeadingBase[]
}

interface HeadingStruct {
  key: string
  title: string
  h2s: HeadingMetadata[]
}

const assert = {
  ul: (tag: FormattedDocTag<DocTagElement>): tag is FormattedDocTag<'ul'> => {
    return tag.tag === 'ul'
  },
  pre: (tag: FormattedDocTag<DocTagElement>): tag is FormattedDocTag<'pre' | `pre.${string}`> => {
    if (tag.tag.startsWith('pre')) { return true }
    return false
  },
  base: (tag: FormattedDocTag<DocTagElement>): tag is FormattedDocTag<Exclude<DocTagElement, 'ul'>> => {
    if (tag.tag !== 'ul') { return true }
    return false
  }
}

declare global {
  interface Window {
    useTheme: () => {
      preferredDark: boolean,
      updateTheme: (theme: Theme) => void,
      toggleTheme: () => void
    }
  }
}

function Menu() {
  const structure: HeadingStruct[] = []

  for (const [pageName, pageData] of formatedPages) {
    if (pageName === 'index') { continue }
    const h2s: HeadingMetadata[] = []
    const root = { key: pageName, title: pageData.title, h2s }
    let h3s: HeadingBase[] = []

    for (const c of pageData.body) {
      if (assert.base(c)) {
        if (c.tag === 'h2') {
          h3s = []
          h2s.push({ value: c.value, id: toID(c.value), h3s })
        } else if (c.tag === 'h3') {
          h3s.push({ value: c.value, id: toID(c.value) })
        }
      }
    }
    structure.push(root)
  }

  onClient(() => {
    const { toggleTheme } = window.useTheme()
    const btn = document.querySelector<HTMLAnchorElement>('#theme-toggle')!
    btn.addEventListener('click', toggleTheme)
  })

  return (
    <aside>
      <nav id="menu">
        <div>
          <div id="widget">
            <a aria-label="Project Brand" href="./">
              <Logo />
            </a>
            <a aria-label="View this project on GitHub" href="https://github.com/nonzzz/squarified">
              <Icons.GitHub />
            </a>
            <a href="javascript:void(0)" aria-label="Toggle theme" id="theme-toggle">
              <Icons.Moon />
              <Icons.Sun />
            </a>
          </div>
          <ul>
            <li>
              <strong>
                <a href="./">Home</a>
              </strong>
            </li>
            {structure.map(({ key, title, h2s }) => (
              <Fragment>
                <li>
                  <strong>{title}</strong>
                </li>
                {h2s.map((h2) => (
                  <li>
                    <a href={key + '#' + h2.id}>{h2.value}</a>
                    {h2.h3s.length > 0 && (
                      <ul>
                        {h2.h3s.map((h3) => (
                          <li>
                            <a href={key + '#' + h3.id}>{h3.value}</a>
                          </li>
                        ))}
                      </ul>
                    )}
                  </li>
                ))}
              </Fragment>
            ))}
            <li>
              <strong>
                <a href="example">Example</a>
              </strong>
            </li>
          </ul>
        </div>
      </nav>
    </aside>
  )
}

interface ArticleProps {
  data: RenderMetadata
}

export function Article(props: ArticleProps) {
  const { data } = props

  return (
    <main>
      {data.body.map((c: FormattedDocTag<DocTagElement>) => {
        if (assert.ul(c)) {
          return (
            <ul>
              {c.value.map((li) => (
                <li>
                  {<li>${md.renderInline(li.trim())}</li>}
                </li>
              ))}
            </ul>
          )
        }
        if (assert.pre(c)) {
          if (c.tag.startsWith('pre.')) {
            const lang = c.tag.split('.')[1]
            return (
              <pre className={`language-${lang}`}>
                {hljs.highlight(c.value.trim(), { language: lang }).value}
              </pre>
            )
          }
          return <pre>${md.render(c.value.trim())}</pre>
        }
        if (assert.base(c)) {
          const Tag = c.tag as unknown as Component<Any>
          if (/^h[2-6]$/.test(c.tag)) {
            const slug = toID(c.value)
            return (
              <Tag id={slug}>
                <a className="anchorlink" aria-hidden="true" href="#${slug}">#</a>
                {md.renderInline(c.value.trim())}
              </Tag>
            )
          }
          return <Tag>{md.renderInline(c.value.trim())}</Tag>
        }
        throw new Error('Unreachable')
      })}
    </main>
  )
}

export function Layout(props: ArticleProps) {
  onClient(() => {
    const { preferredDark, updateTheme } = window.useTheme()
    updateTheme(preferredDark ? 'dark' : 'light')

    const menuButton = document.querySelector<HTMLAnchorElement>('#menu-toggle')!
    const shadow = document.querySelector<HTMLDivElement>('#shadow')!
    const sideMenu = document.querySelector<HTMLElement>('#menu')!

    menuButton.addEventListener('click', () => {
      sideMenu.classList.toggle('open')
      shadow.classList.toggle('open')
    })
    shadow.addEventListener('click', () => {
      sideMenu.classList.toggle('open')
      shadow.classList.toggle('open')
    })
  })

  return (
    <Fragment>
      <div id="menu-container">
        <a href="javascript:void(0)" id="menu-toggle">
          <Icons.Menu />
        </a>
      </div>
      <div id="shadow" />
      <Menu />
      <Article data={props.data} />
    </Fragment>
  )
}

export interface Descriptor {
  kind: 'script' | 'style' | 'title'
  text: string
  attrs?: string[]
}

interface InjectHTMLTagOptions {
  html: string
  injectTo: 'body' | 'head'
  descriptors: Descriptor | Descriptor[]
}

// Refactor this function
export function injectHTMLTag(options: InjectHTMLTagOptions) {
  const regExp = options.injectTo === 'head' ? /([ \t]*)<\/head>/i : /([ \t]*)<\/body>/i
  options.descriptors = Array.isArray(options.descriptors) ? options.descriptors : [options.descriptors]
  const descriptors = options.descriptors.map((d) => {
    if (d.attrs && d.attrs.length > 0) {
      return `<${d.kind} ${d.attrs.join(' ')}>${d.text}</${d.kind}>`
    }
    return `<${d.kind}>${d.text}</${d.kind}>`
  })
  return options.html.replace(regExp, (match) => `${descriptors.join('\n')}${match}`)
}

function buildExampleDisplay() {
  let html = fs.readFileSync(path.join(Dirs.example, 'index.html'), 'utf8')
  html = html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
  html = injectHTMLTag({
    html,
    injectTo: 'body',
    descriptors: {
      kind: 'script',
      text: buildAndMinifyJS(path.join(Dirs.example, 'main.ts'))
    }
  })
  return html
}

async function main() {
  for (const [page, pageData] of formatedPages) {
    const html: string[] = []

    html.push('<!DOCTYPE html>')
    const { html: s, onClientMethods } = renderToString(
      <html lang="en">
        <Head title={pageData.title} />
        <body>
          <Layout data={pageData} />
        </body>
      </html>
    )
    html.push(s)
    html.push(`<script>
      function useTheme() {
        const darkMediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
        const doc = document.documentElement
        const docDataset = doc.dataset
        const preferredDark = darkMediaQuery.matches || localStorage.getItem('theme') === 'dark'
      
        const updateTheme = function(theme) {
          localStorage.setItem('theme', theme)
          docDataset.theme = theme
        }

        const toggleTheme = function() {
         const theme = docDataset.theme === 'light' ? 'dark' : 'light'
         updateTheme(theme)
        }

        return { preferredDark, updateTheme, toggleTheme }
      };
      window.__MOUNTED_CALLBACKS__ = ${JSON.stringify(onClientMethods.map((c) => ({ f: c.toString() })))};
      window.addEventListener('DOMContentLoaded', () => {
         window.__MOUNTED_CALLBACKS__.forEach(({f}) => {
          const fn = new Function('return (' + f + ')();');
          fn();
         });
      });
    </script>`)

    if (!fs.existsSync(Dirs.dest)) {
      fs.mkdirSync(Dirs.dest)
    }

    await fsp.writeFile(path.join(Dirs.dest, `${page}.html`), html.join(''), 'utf8')
  }
  const example = buildExampleDisplay()
  await fsp.copyFile(path.join(Dirs.example, 'data.json'), path.join(Dirs.dest, 'data.json'))
  await fsp.writeFile(path.join(Dirs.dest, 'example.html'), example, 'utf8')
}

main().catch(console.error)
