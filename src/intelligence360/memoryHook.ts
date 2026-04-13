#!/usr/bin/env bun
/**
 * Intelligence360 Memory Hook Worker
 * Called by Claude Code hooks at session lifecycle events.
 * Usage: bun run memoryHook.ts <event> [data...]
 *
 * Events:
 *   session-start  — inject recent memories into CLAUDE.md
 *   session-end    — save session summary
 *   prompt-submit  — save user prompt as memory (optional, noisy)
 *
 * Safety: only runs when INTELLIGENCE360_SESSION is set, so it won't
 * interfere with vanilla Claude Code sessions.
 */
// Guard: skip entirely if not an Intelligence360 session
if (!process.env.INTELLIGENCE360_SESSION && !process.env.INTELLIGENCE360_AUTO_PERMISSIONS) {
  process.exit(0)
}

import { saveMemory, getRecentMemories, injectMemoriesIntoCLAUDEMd } from './memoryDB.js'

const event = process.argv[2] ?? ''
const sessionId = process.env.CLAUDE_SESSION_ID ?? process.env.SESSION_ID ?? ''

async function main() {
  switch (event) {
    case 'session-start': {
      // Inject the 30 most recent memories into CLAUDE.md context
      const entries = getRecentMemories(30)
      if (entries.length > 0) {
        injectMemoriesIntoCLAUDEMd(entries)
      }
      break
    }

    case 'session-end': {
      // Read any piped summary from stdin
      const chunks: Buffer[] = []
      for await (const chunk of process.stdin) chunks.push(chunk as Buffer)
      const summary = Buffer.concat(chunks).toString('utf8').trim()
      if (summary && summary.length > 10) {
        saveMemory(summary, 'session-summary', sessionId, 'observation')
      }
      break
    }

    case 'prompt-submit': {
      // Save the user prompt (read from stdin or argv)
      const prompt = process.argv[3] ?? ''
      if (prompt && prompt.length > 20 && !prompt.startsWith('/')) {
        // Only save substantial non-command prompts
        saveMemory(prompt.slice(0, 500), 'user-prompt', sessionId, 'user')
      }
      break
    }

    default:
      // Unknown event — silently exit
      break
  }
}

main().catch(() => {})
