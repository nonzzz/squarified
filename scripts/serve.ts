import chokidar from 'chokidar'
import fs from 'fs'
import http from 'http'
import path from 'path'
import { x } from 'tinyexec'
import { SSE } from 'vite-bundle-analyzer'

const monitorDirs = {
  docs: path.join(__dirname, '..', 'docs'),
  scripts: __dirname,
  lib: path.join(__dirname, '..', 'src')
}

const MIME_TYPES: Record<string, string> = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpg',
  '.gif': 'image/gif',
  '.wav': 'audio/wav',
  '.mp4': 'video/mp4',
  '.woff': 'application/font-woff',
  '.ttf': 'application/font-ttf',
  '.eot': 'application/vnd.ms-fontobject',
  '.otf': 'application/font-otf',
  '.svg': 'application/image/svg+xml'
}

const watcher = chokidar.watch(Object.values(monitorDirs), {
  ignored: (p) => p.includes('serve.ts')
})

const liveReloadScript = fs.readFileSync(path.join(__dirname, 'live-reload.js'), 'utf8')

function createStaticLivingServer() {
  const app = http.createServer()
  const sse = new SSE()
  app.on('request', (req, res) => {
    if (req.url === '/nonzzz') {
      if (req.headers.accept === 'text/event-stream') {
        sse.serverEventStream(req, res)
        return
      }
    }
    if (req.url === '/favicon.ico' || req.url === '/favicon.svg') {
      res.writeHead(204, { 'Content-Type': 'image/x-icon' })
      res.end()
      return
    }

    // I think is a bug for Chromium
    // https://github.com/withastro/astro/issues/13789
    if (req.url?.includes('.well-known/appspecific/com.chrome.devtools.json')) {
      res.writeHead(404, { 'Content-Type': 'application/json' })
      res.end()
      return
    }

    let file = req.url === '/' ? 'index.html' : req.url!

    if (!path.extname(file)) {
      file += '.html'
    }
    const filePath = path.join(__dirname, '..', 'display', file)
    const ext = path.extname(filePath)

    const contentType = MIME_TYPES[ext] || 'text/html'
    let content = fs.readFileSync(filePath, 'utf8')
    if (ext === '.html') {
      content += `<script>${liveReloadScript}</script>`
    }
    res.writeHead(200, { 'Content-Type': contentType })
    res.write(content)
    res.end()
  })

  watcher.on('all', (event, path) => {
    if (event === 'change') {
      prepareDisplay().then(() => {
        sse.sendEvent('change', path)
      }).catch(console.error)
    }
  })

  return app
}

async function prepareDisplay() {
  const r = await x('./node_modules/.bin/tsx', ['./scripts/render.tsx'], { nodeOptions: { cwd: process.cwd() } })
  if (r.stderr) {
    throw new Error(r.stderr)
  }
  console.log(r.stdout)
  return r.exitCode === 0
}

async function main() {
  await prepareDisplay()

  const server = createStaticLivingServer()

  server.listen(8090, () => {
    console.log('Server running on http://localhost:8090')
  })
}

export interface SSEMessageBody {
  event: string
  data: string
}

main().catch(console.error)
