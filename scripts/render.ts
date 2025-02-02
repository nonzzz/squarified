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

function minifyCSS(css: string) {
  return esbuild.transformSync(css, { target, loader: 'css', minify: true }).code
}

function minifyJS(js: string) {
  return esbuild.transformSync(js, { target, loader: 'ts', minify: true }).code
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
      return `<${c.tag}>${md.renderInline(c.value.trim())}</${c.tag}>`
    }
    throw new Error('Unreachable')
  }
  return pageData.body
    .reduce<string[]>((acc, cur) => (acc.push(handler(cur)), acc), [])
    .join('\n')
}

function renderMenu(page: string): string {
  const structure = []
  for (const [pageName, pageData] of formatedPages) {
    if (pageName === 'index') { continue }
    const h2s: string[] = []
    const root = { key: pageName, title: pageData.title, h2s }
    const h3s: string[] = []

    for (const { tag, value } of pageData.body) {
      if (tag === 'h2' && typeof value === 'string') {
        h2s.push(value)
      }
      if (tag === 'h3' && typeof value === 'string') {
        h3s.push(value)
      }
    }
    structure.push(root)
  }

  const navs: string[] = []

  console.log(structure)
  for (const { key, title, h2s } of structure) {
    navs.push(`<li><strong>${title}</strong></li>`)
    for (const h2 of h2s) {
      navs.push(`<li><a href="/${key}.html#${h2}">${h2}</a></li>`)
    }
  }
  return navs.join('')
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

    // id="menu-container"
    html.push('<aside>')

    html.push('<nav id="menu">')

    html.push('<ul>')
    html.push(renderMenu(page))
    html.push('</ul>')
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
    await fsp.writeFile(path.join(destDir, `${page}.html`), html.join('\n'), 'utf8')
  }
}

main().catch(console.error)
