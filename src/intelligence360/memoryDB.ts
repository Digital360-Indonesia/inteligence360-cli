/**
 * Intelligence360 Persistent Memory
 * SQLite-backed cross-session memory with full-text search.
 * Stored at ~/.intelligence360/memory.db
 */
import { existsSync, mkdirSync } from 'fs'
import { homedir } from 'os'
import { join } from 'path'

const DB_DIR = join(homedir(), '.intelligence360')
const DB_PATH = join(DB_DIR, 'memory.db')

export interface MemoryEntry {
  id: number
  session_id: string
  role: 'user' | 'assistant' | 'observation'
  content: string
  tags: string
  created_at: number
}

let _db: ReturnType<typeof openDB> | null = null

function openDB() {
  mkdirSync(DB_DIR, { recursive: true })
  // Bun's built-in SQLite
  const { Database } = require('bun:sqlite') as typeof import('bun:sqlite')
  const db = new Database(DB_PATH)
  db.run('PRAGMA journal_mode=WAL')
  db.run(`
    CREATE TABLE IF NOT EXISTS memories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id TEXT NOT NULL DEFAULT '',
      role TEXT NOT NULL DEFAULT 'observation',
      content TEXT NOT NULL,
      tags TEXT NOT NULL DEFAULT '',
      created_at INTEGER NOT NULL DEFAULT (unixepoch())
    )
  `)
  db.run(`
    CREATE VIRTUAL TABLE IF NOT EXISTS memories_fts USING fts5(
      content,
      tags,
      content=memories,
      content_rowid=id
    )
  `)
  // FTS trigger: keep index in sync
  db.run(`
    CREATE TRIGGER IF NOT EXISTS memories_ai AFTER INSERT ON memories BEGIN
      INSERT INTO memories_fts(rowid, content, tags) VALUES (new.id, new.content, new.tags);
    END
  `)
  db.run(`
    CREATE TRIGGER IF NOT EXISTS memories_ad AFTER DELETE ON memories BEGIN
      INSERT INTO memories_fts(memories_fts, rowid, content, tags) VALUES('delete', old.id, old.content, old.tags);
    END
  `)
  return db
}

function getDB() {
  if (!_db) _db = openDB()
  return _db
}

export function saveMemory(content: string, tags = '', sessionId = '', role: MemoryEntry['role'] = 'observation'): number {
  const db = getDB()
  const stmt = db.prepare(
    'INSERT INTO memories (session_id, role, content, tags) VALUES (?, ?, ?, ?)'
  )
  const result = stmt.run(sessionId, role, content.trim(), tags.trim())
  return result.lastInsertRowid as number
}

export function searchMemories(query: string, limit = 10): MemoryEntry[] {
  const db = getDB()
  if (!query.trim()) return getRecentMemories(limit)
  try {
    // FTS5 search
    const rows = db.prepare(`
      SELECT m.* FROM memories m
      JOIN memories_fts f ON m.id = f.rowid
      WHERE memories_fts MATCH ?
      ORDER BY rank, m.created_at DESC
      LIMIT ?
    `).all(query, limit) as MemoryEntry[]
    return rows
  } catch {
    // Fallback to LIKE if FTS fails
    return db.prepare(`
      SELECT * FROM memories
      WHERE content LIKE ? OR tags LIKE ?
      ORDER BY created_at DESC LIMIT ?
    `).all(`%${query}%`, `%${query}%`, limit) as MemoryEntry[]
  }
}

export function getRecentMemories(limit = 20): MemoryEntry[] {
  return getDB()
    .prepare('SELECT * FROM memories ORDER BY created_at DESC LIMIT ?')
    .all(limit) as MemoryEntry[]
}

export function deleteMemory(id: number): boolean {
  const result = getDB().prepare('DELETE FROM memories WHERE id = ?').run(id)
  return (result.changes as number) > 0
}

export function clearAllMemories(): number {
  const result = getDB().prepare('DELETE FROM memories').run()
  return result.changes as number
}

export function getMemoryStats(): { total: number; oldest: number | null; newest: number | null } {
  const row = getDB()
    .prepare('SELECT COUNT(*) as total, MIN(created_at) as oldest, MAX(created_at) as newest FROM memories')
    .get() as { total: number; oldest: number | null; newest: number | null }
  return row
}

export function formatMemoryForContext(entries: MemoryEntry[]): string {
  if (!entries.length) return ''
  const lines = entries.map(e => {
    const date = new Date(e.created_at * 1000).toISOString().slice(0, 10)
    const tag = e.tags ? ` [${e.tags}]` : ''
    return `- (${date}${tag}) ${e.content}`
  })
  return lines.join('\n')
}

export function injectMemoriesIntoCLAUDEMd(entries: MemoryEntry[]): void {
  if (!entries.length) return
  const { existsSync, readFileSync, writeFileSync, mkdirSync } = require('fs') as typeof import('fs')
  const CLAUDE_MD = join(homedir(), '.claude', 'CLAUDE.md')
  mkdirSync(join(homedir(), '.claude'), { recursive: true })
  let existing = existsSync(CLAUDE_MD) ? readFileSync(CLAUDE_MD, 'utf8') : ''
  const block = `<!-- MEMORY:START -->\n## Recent Session Memory\n\n${formatMemoryForContext(entries)}\n<!-- MEMORY:END -->`
  if (existing.includes('<!-- MEMORY:START -->')) {
    existing = existing.replace(/<!-- MEMORY:START -->[\s\S]*?<!-- MEMORY:END -->/m, block)
  } else {
    existing = existing.trimEnd() + '\n\n' + block + '\n'
  }
  writeFileSync(CLAUDE_MD, existing)
}
