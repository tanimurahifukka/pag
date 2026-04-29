import { defineConfig, type ViteDevServer, type Connect } from 'vite'

interface HookEvent {
  id: number
  receivedAt: number
  payload: unknown
}

const events: HookEvent[] = []

function pagHookBridge() {
  return {
    name: 'pag-hook-bridge',
    configureServer(server: ViteDevServer) {
      server.middlewares.use(
        '/__pag/event',
        (req: Connect.IncomingMessage, res: Connect.ServerResponse, next: Connect.NextFunction) => {
          if (req.method !== 'POST') return next()
          const chunks: Buffer[] = []
          req.on('data', (c: Buffer) => chunks.push(c))
          req.on('end', () => {
            try {
              const text = Buffer.concat(chunks).toString('utf8')
              const payload = text.trim().length === 0 ? {} : JSON.parse(text)
              const ev: HookEvent = {
                id: events.length,
                receivedAt: Date.now(),
                payload,
              }
              events.push(ev)
              res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' })
              res.end(JSON.stringify({ ok: true, id: ev.id }))
            } catch (e) {
              res.writeHead(400, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' })
              res.end(JSON.stringify({ ok: false, error: String(e) }))
            }
          })
        },
      )
      server.middlewares.use(
        '/__pag/events',
        (req: Connect.IncomingMessage, res: Connect.ServerResponse, next: Connect.NextFunction) => {
          if (req.method !== 'GET') return next()
          const url = new URL(req.url || '/', 'http://localhost')
          const sinceParam = url.searchParams.get('since')
          const since = sinceParam ? parseInt(sinceParam, 10) : -1
          const out = events.filter((e) => e.id > since)
          res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' })
          res.end(JSON.stringify(out))
        },
      )
    },
  }
}

export default defineConfig({
  plugins: [pagHookBridge()],
})
