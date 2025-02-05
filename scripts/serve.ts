import chokidar from 'chokidar'
import { EventEmitter } from 'events'
import fs from 'fs'
import http from 'http'
import path from 'path'
import { x } from 'tinyexec'

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
    if (req.url === '/favicon.ico') {
      res.writeHead(204, { 'Content-Type': 'image/x-icon' })
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
    content += `<script>${liveReloadScript}</script>`
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
  const r = await x('./node_modules/.bin/tsx', ['./scripts/render.ts'], { nodeOptions: { cwd: process.cwd() } })
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

// This exposes an event stream to clients using server-sent events:
// https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events
export class SSE {
  private activeStreams: EventEmitter[] = []

  serverEventStream(req: http.IncomingMessage, res: http.ServerResponse) {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
      'access-control-allow-origin': '*'
    })
    res.write('retry: 500\n')
    res.write(':\n\n')
    res.flushHeaders()
    const stream = new EventEmitter()
    this.activeStreams.push(stream)
    const keepAliveInterval = setInterval(() => {
      res.write(':\n\n')
      res.flushHeaders()
    }, 3000)
    stream.on('message', (msg: SSEMessageBody) => {
      res.write(`event: ${msg.event}\ndata: ${msg.data}\n\n`)
      res.flushHeaders()
    })
    req.on('close', () => {
      clearInterval(keepAliveInterval)
      this.removeStream(stream)
      res.end()
    })
  }

  sendEvent(event: string, data: string) {
    const message: SSEMessageBody = { event, data }
    this.activeStreams.forEach((stream) => {
      stream.emit('message', message)
    })
  }

  private removeStream(stream: EventEmitter) {
    const index = this.activeStreams.indexOf(stream)
    if (index !== -1) {
      this.activeStreams.splice(index, 1)
    }
  }
}

main().catch(console.error)
