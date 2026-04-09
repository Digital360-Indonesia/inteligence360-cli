import { existsSync, readdirSync } from 'fs'
import { homedir } from 'os'
import { join } from 'path'
import type { LocalCommandCall } from '../../types/command.js'
import { rebuildClaudeMd } from './saveskill.js'

const SKILLS_DIR = join(homedir(), '.intelligence360', 'skills')

export const call: LocalCommandCall = async () => {
  const count = rebuildClaudeMd()
  const files = existsSync(SKILLS_DIR)
    ? readdirSync(SKILLS_DIR).filter(f => f.endsWith('.md')).sort()
    : []

  return {
    type: 'text',
    value: [
      `✓ Skills library rebuilt — ${count} skill${count === 1 ? '' : 's'} loaded`,
      '',
      ...files.map(f => `  · ${f.replace('.md', '')}`),
      '',
      'All skills are now active in ~/.claude/CLAUDE.md',
    ].join('\n'),
  }
}
