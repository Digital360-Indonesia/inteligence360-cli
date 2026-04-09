import { existsSync, readFileSync, readdirSync, statSync, watch } from 'fs'
import { homedir } from 'os'
import { join } from 'path'
import { messageBus } from './messageBus.js'

const PORT = 3621
const PROJECTS_DIR = join(homedir(), '.claude', 'projects')
const ENV_FILE = join(homedir(), '.intelligence360.env')

// ── Provider helpers ─────────────────────────────────────────────────────────

const PROVIDERS = [
  { key: 'ANTHROPIC_API_KEY', name: 'Claude',   prefix: 'claude'   },
  { key: 'OPENAI_API_KEY',    name: 'OpenAI',   prefix: 'openai'   },
  { key: 'GEMINI_API_KEY',    name: 'Gemini',   prefix: 'gemini'   },
  { key: 'GROK_API_KEY',      name: 'Grok',     prefix: 'grok'     },
  { key: 'GLM_API_KEY',       name: 'GLM',      prefix: 'glm'      },
  { key: 'DEEPSEEK_API_KEY',  name: 'DeepSeek', prefix: 'deepseek' },
  { key: 'QWEN_API_KEY',      name: 'Qwen',     prefix: 'qwen'     },
  { key: 'GROQ_API_KEY',      name: 'Llama',    prefix: 'llama'    },
]

function getSavedKeys(): Set<string> {
  const saved = new Set<string>()
  if (existsSync(ENV_FILE)) {
    for (const line of readFileSync(ENV_FILE, 'utf8').split('\n')) {
      const k = line.split('=')[0]?.trim()
      if (k) saved.add(k)
    }
  }
  return saved
}

function getProviderStatus() {
  const saved = getSavedKeys()
  return PROVIDERS.map(p => ({
    ...p,
    configured: !!(process.env[p.key] || saved.has(p.key)),
  }))
}

// ── Session helpers ──────────────────────────────────────────────────────────

function listSessions() {
  if (!existsSync(PROJECTS_DIR)) return []
  const sessions: { id: string; project: string; modified: number; summary: string }[] = []

  for (const proj of readdirSync(PROJECTS_DIR)) {
    const projPath = join(PROJECTS_DIR, proj)
    try {
      if (!statSync(projPath).isDirectory()) continue
      for (const file of readdirSync(projPath)) {
        if (!file.endsWith('.jsonl')) continue
        const filePath = join(projPath, file)
        const stat = statSync(filePath)
        const id = file.replace('.jsonl', '')
        // Read first user message for summary
        let summary = ''
        try {
          const lines = readFileSync(filePath, 'utf8').split('\n').filter(Boolean)
          for (const line of lines) {
            const entry = JSON.parse(line) as Record<string, unknown>
            if (entry.type === 'user') {
              const msg = entry.message as Record<string, unknown>
              const content = msg?.content
              if (typeof content === 'string') { summary = content.slice(0, 80); break }
              if (Array.isArray(content)) {
                const text = content.find((b: Record<string, unknown>) => b.type === 'text')
                if (text) { summary = String((text as Record<string, unknown>).text ?? '').slice(0, 80); break }
              }
            }
          }
        } catch {}
        sessions.push({ id, project: proj, modified: stat.mtimeMs, summary })
      }
    } catch {}
  }

  return sessions.sort((a, b) => b.modified - a.modified).slice(0, 50)
}

function getSessionMessages(project: string, sessionId: string) {
  const path = join(PROJECTS_DIR, project, `${sessionId}.jsonl`)
  if (!existsSync(path)) return []
  const messages: { role: string; text: string; ts: string }[] = []
  try {
    for (const line of readFileSync(path, 'utf8').split('\n').filter(Boolean)) {
      const entry = JSON.parse(line) as Record<string, unknown>
      const role = entry.type as string
      if (role !== 'user' && role !== 'assistant') continue
      const msg = entry.message as Record<string, unknown>
      const content = msg?.content
      let text = ''
      if (typeof content === 'string') {
        text = content
      } else if (Array.isArray(content)) {
        text = content
          .filter((b: Record<string, unknown>) => b.type === 'text')
          .map((b: Record<string, unknown>) => String(b.text ?? ''))
          .join('\n')
      }
      if (text.trim()) {
        messages.push({ role, text, ts: String(entry.timestamp ?? '') })
      }
    }
  } catch {}
  return messages
}

// ── File watcher ─────────────────────────────────────────────────────────────

let currentWatcher: ReturnType<typeof watch> | null = null

function watchSession(project: string, sessionId: string) {
  currentWatcher?.close()
  const path = join(PROJECTS_DIR, project, `${sessionId}.jsonl`)
  if (!existsSync(path)) return
  let lastSize = statSync(path).size
  currentWatcher = watch(path, () => {
    try {
      const newSize = statSync(path).size
      if (newSize <= lastSize) return
      const content = readFileSync(path, 'utf8')
      const newLines = content.slice(lastSize).split('\n').filter(Boolean)
      lastSize = newSize
      for (const line of newLines) {
        try {
          const entry = JSON.parse(line) as Record<string, unknown>
          messageBus.broadcast({ type: 'message', entry })
        } catch {}
      }
    } catch {}
  })
}

// ── Dashboard HTML ────────────────────────────────────────────────────────────

function getDashboardHTML(): string {
  const htmlPath = join(import.meta.dir, 'dashboard.html')
  return existsSync(htmlPath) ? readFileSync(htmlPath, 'utf8') : '<h1>Dashboard not found</h1>'
}

// ── Bun server ────────────────────────────────────────────────────────────────

const clients = new Set<import('bun').ServerWebSocket<unknown>>()

export function startDashboardServer(currentModel: string) {
  const server = Bun.serve({
    port: PORT,
    fetch(req, server) {
      const url = new URL(req.url)

      // WebSocket upgrade
      if (server.upgrade(req)) return undefined as unknown as Response

      // API routes
      if (url.pathname === '/api/sessions') {
        return Response.json(listSessions())
      }

      if (url.pathname.startsWith('/api/session/')) {
        const parts = url.pathname.split('/').filter(Boolean)
        // /api/session/:project/:sessionId
        const project = parts[2] ?? ''
        const sessionId = parts[3] ?? ''
        if (url.searchParams.get('watch') === '1') {
          watchSession(project, sessionId)
        }
        return Response.json(getSessionMessages(project, sessionId))
      }

      if (url.pathname === '/api/status') {
        return Response.json({
          model: currentModel,
          providers: getProviderStatus(),
        })
      }

      // Serve dashboard
      return new Response(getDashboardHTML(), {
        headers: { 'Content-Type': 'text/html; charset=utf-8' },
      })
    },
    websocket: {
      open(ws) {
        clients.add(ws)
        ws.send(JSON.stringify({ type: 'connected', model: currentModel }))
      },
      close(ws) {
        clients.delete(ws)
      },
      message(_ws, msg) {
        try {
          const ev = JSON.parse(String(msg)) as Record<string, unknown>
          if (ev.type === 'input' && typeof ev.text === 'string' && ev.text.trim()) {
            // Inject text into stdin so the running REPL receives it
            process.stdin.push(ev.text + '\n')
          }
        } catch {}
      },
    },
  })

  // Forward messageBus events to all WS clients
  messageBus.on('event', (event: unknown) => {
    const payload = JSON.stringify(event)
    for (const ws of clients) {
      try { ws.send(payload) } catch {}
    }
  })

  return server
}

export { PORT }
