import fs from 'fs'
import fsp from 'fs/promises'
import yaml from 'js-yaml'
import markdownit from 'markdown-it'
import path from 'path'

const md = markdownit({ html: true })

const docsDir = path.join(__dirname, '..', 'docs')

const destDir = path.join(__dirname, '..', 'display')

export interface RenderMetadata {
  title: string
  body: Array<{ tag: string, value: string } & AnyObject>
}

const data = yaml.load(fs.readFileSync(path.join(docsDir, 'index.yaml'), 'utf8')) as Record<string, RenderMetadata>

const pages = Object.entries(data)

// load nesting page

// eslint-disable-next-line @typescript-eslint/no-unused-vars
for (const [_, pageData] of pages) {
  pageData.body = pageData.body.map((sec) => {
    const tag = Object.keys(sec)[0]
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    return { tag, value: sec[tag] }
  })
}

function renderMainSection(page: string, pageData: RenderMetadata): string {
  const handler = ({ tag, value }: { tag: string, value: string }): string => {
    return `<${tag}>${md.renderInline(value.trim())}</${tag}>`
  }

  return pageData.body
    .reduce<string[]>((acc, cur) => (acc.push(handler(cur)), acc), [])
    .join('\n')
}

async function main() {
  for (const [page, pageData] of pages) {
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
    html.push('</head>')

    // Body

    html.push('<body>')

    // Menu

    // Article
    html.push('<main>')
    html.push(renderMainSection(page, pageData))
    html.push('</main>')
    html.push('</body>')
    html.push('</html>')
    html.push('\n')
    if (!fs.existsSync(destDir)) {
      fs.mkdirSync(destDir)
    }
    await fsp.writeFile(path.join(destDir, `${page}.html`), html.join('\n'), 'utf8')
  }
}

main().catch((e) => console.error(e))
