import esbuild from 'esbuild'
import fs from 'fs'
import fsp from 'fs/promises'
import hljs from 'highlight.js'
import yaml from 'js-yaml'
import markdownit from 'markdown-it'
import path from 'path'
import type { Theme } from './theme'

const md = markdownit({ html: true })

const docsDir = path.join(__dirname, '..', 'docs')

const devDir = path.join(__dirname, '..', 'dev')

const destDir = path.join(__dirname, '..', 'display')

const scriptDir = __dirname

const target = ['chrome58', 'safari11', 'firefox57', 'edge16']

type TagElement = 'p' | 'ul' | 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6' | 'pre' | `pre.${string}`

type TagValue<T extends TagElement> = T extends 'ul' ? string[] : string

interface FormattedTag<T extends TagElement> {
  tag: T
  value: TagValue<T>
}

type AnyFormattedTag = FormattedTag<TagElement>

interface RenderMetadata {
  title: string
  body: AnyFormattedTag[]
}

const data = yaml.load(fs.readFileSync(path.join(docsDir, 'index.yaml'), 'utf8')) as Record<string, RenderMetadata | string>

const pages = Object.entries(data)

function createTag<T extends TagElement>(tag: T, value: TagValue<T>): FormattedTag<T> {
  return { tag, value }
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

function minifyCSS(css: string) {
  return esbuild.transformSync(css, { target, loader: 'css', minify: true }).code
}

function minifyJS(js: string) {
  return esbuild.transformSync(js, { target, loader: 'ts', minify: true }).code
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

const formatedPages = pages.reduce((acc, [page, pageData]) => {
  if (typeof pageData === 'string') {
    if (pageData.endsWith('.yaml')) {
      pageData = yaml.load(fs.readFileSync(path.join(docsDir, pageData), 'utf8')) as RenderMetadata
    }
  }
  if (typeof pageData === 'object') {
    pageData.body = pageData.body.map((sec) => {
      const tag = Object.keys(sec)[0]
      // @ts-expect-error safe
      return createTag(tag as TagElement, sec[tag] as TagValue<typeof tag>)
    })
  }
  // @ts-expect-error safe
  acc.push([page, pageData])
  return acc
}, [] as [string, RenderMetadata][])

const hljsPath = path.dirname(require.resolve('highlight.js/package.json', { paths: [process.cwd()] }))

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

const hljsGithubCSS = {
  light: pipeOriginalCSSIntoThemeSystem(fs.readFileSync(path.join(hljsPath, 'styles/github.css'), 'utf-8'), 'light'),
  dark: pipeOriginalCSSIntoThemeSystem(fs.readFileSync(path.join(hljsPath, 'styles/github-dark.css'), 'utf-8'), 'dark')
}

const commonCSS = minifyCSS(fs.readFileSync(path.join(scriptDir, 'style.css'), 'utf8'))

const coomonScript = minifyJS(fs.readFileSync(path.join(scriptDir, 'theme.ts'), 'utf8'))

const assert = {
  ul: (tag: FormattedTag<TagElement>): tag is FormattedTag<'ul'> => {
    return tag.tag === 'ul'
  },
  pre: (tag: FormattedTag<TagElement>): tag is FormattedTag<'pre' | `pre.${string}`> => {
    if (tag.tag.startsWith('pre')) { return true }
    return false
  },
  base: (tag: FormattedTag<TagElement>): tag is FormattedTag<Exclude<TagElement, 'ul'>> => {
    if (tag.tag !== 'ul') { return true }
    return false
  }
}

function toID(text: string) {
  return text.trim().toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]+/g, '')
}

function renderMainSection(page: string, pageData: RenderMetadata): string {
  const handler = (c: FormattedTag<TagElement>): string => {
    if (assert.ul(c)) {
      return `<ul>${c.value.map((li) => `<li>${md.renderInline(li.trim())}</li>`).join('')}</ul>`
    }
    if (assert.pre(c)) {
      if (c.tag.startsWith('pre.')) {
        const lang = c.tag.split('.')[1]
        return `<pre class="language-${lang}">${hljs.highlight(c.value.trim(), { language: lang }).value}</pre>`
      }
      return `<pre>${md.render(c.value.trim())}</pre>`
    }
    if (assert.base(c)) {
      // For heading metadata
      if (/^h[2-6]$/.test(c.tag)) {
        const slug = toID(c.value)
        return `<${c.tag} id="${slug}"><a class="anchorlink" aria-hidden="true" href="#${slug}">#</a>${
          md.renderInline(c.value.trim())
        }</${c.tag}>`
      }

      return `<${c.tag}>${md.renderInline(c.value.trim())}</${c.tag}>`
    }
    throw new Error('Unreachable')
  }
  return pageData.body
    .reduce<string[]>((acc, cur) => (acc.push(handler(cur)), acc), [])
    .join('\n')
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

function renderMenu(): string {
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

  const navs: string[] = []

  for (const { key, title, h2s } of structure) {
    navs.push(`<li><strong>${title}</strong></li>`)
    for (const h2 of h2s) {
      navs.push(`<li><a href="/${key}#${h2.id}">${h2.value}</a></li>`)
      if (h2.h3s.length > 0) {
        navs.push('<ul>')
        for (const h3 of h2.h3s) {
          navs.push(`<li><a href="/${key}#${h3.id}">${h3.value}</a></li>`)
        }
        navs.push('</ul>')
      }
    }
  }
  return navs.join('')
}

const icons = {
  moon: `
  <svg id="theme-light" xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 256 256">
    <path fill="currentColor" d="M233.54 142.23a8 8 0 0 0-8-2a88.08 88.08 0 0
      1-109.8-109.8a8 8 0 0 0-10-10a104.84 104.84 0 0 0-52.91 37A104 104 0 0 0
      136 224a103.1 103.1 0 0 0 62.52-20.88a104.84 104.84 0 0 0 37-52.91a8 8 0
      0 0-1.98-7.98m-44.64 48.11A88 88 0 0 1 65.66 67.11a89 89 0 0 1
      31.4-26A106 106 0 0 0 96 56a104.11 104.11 0 0 0 104 104a106 106 0 0 0
      14.92-1.06a89 89 0 0 1-26.02 31.4"/>
  </svg>
`.trim(),
  sun: `
  <svg id="theme-dark" xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 256 256">
    <path fill="currentColor" d="M120 40V16a8 8 0 0 1 16 0v24a8 8 0 0 1-16 0m72
      88a64 64 0 1 1-64-64a64.07 64.07 0 0 1 64 64m-16 0a48 48 0 1 0-48 48a48.05
      48.05 0 0 0 48-48M58.34 69.66a8 8 0 0 0 11.32-11.32l-16-16a8 8 0 0
      0-11.32 11.32Zm0 116.68l-16 16a8 8 0 0 0 11.32 11.32l16-16a8 8 0 0
      0-11.32-11.32M192 72a8 8 0 0 0 5.66-2.34l16-16a8 8 0 0 0-11.32-11.32l-16
      16A8 8 0 0 0 192 72m5.66 114.34a8 8 0 0 0-11.32 11.32l16 16a8 8 0 0 0
      11.32-11.32ZM48 128a8 8 0 0 0-8-8H16a8 8 0 0 0 0 16h24a8 8 0 0 0
      8-8m80 80a8 8 0 0 0-8 8v24a8 8 0 0 0 16 0v-24a8 8 0 0 0-8-8m112-88h-24a8
      8 0 0 0 0 16h24a8 8 0 0 0 0-16"/>
  </svg>
`.trim(),
  github: `
  <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 256 256">
    <path fill="currentColor" d="M208.31 75.68A59.78 59.78 0 0 0 202.93 28a8 8
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
      0 0 1 7 22.52Z"/>
  </svg>
`.trim()
}

function widget() {
  const html: string[] = []
  html.push('<div id="widget">')
  html.push('<a aria-label="View this project on GitHub" href="https://github.com/nonzzz/squarified">')
  html.push(icons.github)
  html.push('</a>')
  html.push('<a href="javascript:void(0)" aria-label="Toggle theme" id="theme-toggle">')
  html.push(icons.moon)
  html.push(icons.sun)
  html.push('</a>')
  html.push('</div>')
  return html
}

function buildExampleDisplay() {
  let html = fs.readFileSync(path.join(devDir, 'index.html'), 'utf8')
  html = html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
  html = injectHTMLTag({
    html,
    injectTo: 'body',
    descriptors: {
      kind: 'script',
      text: buildAndMinifyJS(path.join(devDir, 'main.ts'))
    }
  })
  return html
}

async function main() {
  for (const [page, pageData] of formatedPages) {
    const html: string[] = []
    html.push('<!DOCTYPE html>')
    html.push('<html lang="en">')

    // Head
    html.push('<head>')
    html.push('<meta charset="UTF-8">')
    html.push('<meta http-equiv="X-UA-Compatible" content="IE=edge">')
    html.push('<meta name="viewport" content="width=device-width, initial-scale=1.0">')
    html.push(`<title>squarified - ${pageData.title}</title>`)
    html.push('<link rel="icon" type="image/svg+xml" href="/favicon.svg">')
    html.push('<meta property="og:type" content="website"/>')
    html.push('<meta property="og:title" content="squarified"/>')
    html.push('<meta property="og:description" content="A simple and fast way to generate treemaps"/>')
    html.push(`<style>${hljsGithubCSS.light}</style>`)
    html.push(`<style>${hljsGithubCSS.dark}</style>`)
    html.push(`<style>${commonCSS}</style>`)
    html.push('</head>')

    // Body

    html.push('<body>')

    // Menu

    html.push('<aside>')
    html.push('<nav id="menu">')
    html.push('<div>')
    html.push(widget().join(''))
    html.push('<ul>')
    html.push(renderMenu())

    // example

    html.push('<li><strong><a href="/example">Example</a></strong></li>')

    html.push('</ul>')
    html.push('</div>')
    html.push('</nav>')
    html.push('</aside>')

    // Article
    html.push('<main>')
    html.push(renderMainSection(page, pageData))
    html.push('</main>')
    html.push('</body>')
    html.push(`<script>${coomonScript}</script>`)
    html.push('</html>')
    html.push('\n')
    if (!fs.existsSync(destDir)) {
      fs.mkdirSync(destDir)
    }
    await fsp.writeFile(path.join(destDir, `${page}.html`), html.join(''), 'utf8')
  }
  const example = buildExampleDisplay()
  // cp data.json to display
  await fsp.copyFile(path.join(devDir, 'data.json'), path.join(destDir, 'data.json'))
  await fsp.writeFile(path.join(destDir, 'example.html'), example, 'utf8')
}

main().catch(console.error)
