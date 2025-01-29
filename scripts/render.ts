import fs from 'fs'
import yaml from 'js-yaml'
import markdownit from 'markdown-it'
import path from 'path'

const md = markdownit({ html: true })

const docsDir = path.join(__dirname, '..', 'docs')

const data = yaml.load(fs.readFileSync(path.join(docsDir, 'index.yaml'), 'utf8')) as Record<string, AnyObject>

console.log(data)
const pages = Object.entries(data)

// load nesting page

for (const [page, pageData] of pages) {
  //   const pagePath = path.join(docsDir, `${page}.md`)
  //   const pageContent = fs.readFileSync(pagePath, 'utf8')
  //   const html = md.render(pageContent)
  //   console.log(html)
}

async function main() {
  for (const [page, pageData] of pages) {
    // const pagePath = path.join(docsDir, `${page}.md`)
    // const pageContent = fs.readFileSync(pagePath, 'utf8')
    // const html = md.render(pageContent)
    // console.log(html)
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
    html.push('</body>')
    html.push('</html>')
    html.push('\n')
  }
}

main().catch((e) => console.error(e))
