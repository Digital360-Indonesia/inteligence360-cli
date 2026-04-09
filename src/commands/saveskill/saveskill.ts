import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'fs'
import { homedir } from 'os'
import { join } from 'path'
import type { LocalCommandCall } from '../../types/command.js'

const SKILLS_DIR = join(homedir(), '.intelligence360', 'skills')
const BUNDLED_SKILLS_DIR = join(import.meta.dir, '..', '..', '..', 'skills')
const CLAUDE_MD = join(homedir(), '.claude', 'CLAUDE.md')

interface SkillMeta {
  name: string
  description: string
  category?: string
  status?: string
}

function parseSkillMeta(content: string): SkillMeta | null {
  const match = content.match(/^---\n([\s\S]*?)\n---/)
  if (!match) return null
  const front = match[1]!
  const get = (key: string) => {
    const m = front.match(new RegExp(`^${key}:\\s*(.+)$`, 'm'))
    return m ? m[1]!.replace(/^["']|["']$/g, '').trim() : undefined
  }
  const name = get('name')
  const description = get('description')
  if (!name || !description) return null
  return { name, description, category: get('category'), status: get('status') }
}

function getFirstCodeBlock(content: string): string {
  const m = content.match(/```[\w]*\n([\s\S]*?)```/)
  return m ? m[0] : ''
}

export function rebuildClaudeMd() {
  mkdirSync(SKILLS_DIR, { recursive: true })

  // Collect skill folders from both user dir and bundled dir (user takes precedence)
  const seen = new Set<string>()
  const skillEntries: { name: string; dir: string }[] = []

  for (const base of [SKILLS_DIR, BUNDLED_SKILLS_DIR]) {
    if (!existsSync(base)) continue
    for (const d of readdirSync(base, { withFileTypes: true })) {
      if (!d.isDirectory()) continue
      if (seen.has(d.name)) continue
      if (!existsSync(join(base, d.name, 'SKILL.md'))) continue
      seen.add(d.name)
      skillEntries.push({ name: d.name, dir: base })
    }
  }
  skillEntries.sort((a, b) => a.name.localeCompare(b.name))
  const skillFolders = skillEntries.map(e => e.name)

  let skillsBlock = '<!-- SKILLS:START -->\n'

  if (skillFolders.length === 0) {
    skillsBlock += '_No skills saved yet. Use /saveskill inside Intelligence360 to add one._\n'
  } else {
    for (const entry of skillEntries) {
    const folder = entry.name
    {
      const content = readFileSync(join(entry.dir, folder, 'SKILL.md'), 'utf8')
      const meta = parseSkillMeta(content)
      if (!meta) continue

      const code = getFirstCodeBlock(content)
      const category = meta.category ? ` · ${meta.category}` : ''
      const status = meta.status ? ` · ${meta.status}` : ''

      skillsBlock += `### ${meta.name}${category}${status}\n`
      skillsBlock += `${meta.description}\n`
      if (code) skillsBlock += `${code}\n`
      skillsBlock += `Full details: ${entry.dir}/${folder}/SKILL.md\n\n`
    }
  }
  }

  skillsBlock += '<!-- SKILLS:END -->'

  // Update CLAUDE.md
  mkdirSync(join(homedir(), '.claude'), { recursive: true })
  let existing = existsSync(CLAUDE_MD) ? readFileSync(CLAUDE_MD, 'utf8') : ''

  if (existing.includes('<!-- SKILLS:START -->')) {
    existing = existing.replace(/<!-- SKILLS:START -->[\s\S]*?<!-- SKILLS:END -->/m, skillsBlock)
  } else {
    existing = existing.trimEnd() + '\n\n## Skills Library\n\n' + skillsBlock + '\n'
  }

  writeFileSync(CLAUDE_MD, existing)
  return skillFolders.length
}

export const call: LocalCommandCall = async (args) => {
  const parts = args.trim().split(/\s+/)
  const name = parts[0]

  if (!name) {
    return {
      type: 'text',
      value: [
        'Usage: /saveskill <name> [description]',
        '',
        'Creates ~/.intelligence360/skills/<name>/SKILL.md',
        '',
        'Example: /saveskill twitter-scrape Download tweets without API key',
      ].join('\n'),
    }
  }

  const description = parts.slice(1).join(' ')
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
  const skillDir = join(SKILLS_DIR, slug)
  const filePath = join(skillDir, 'SKILL.md')

  if (existsSync(skillDir)) {
    return {
      type: 'text',
      value: `Skill "${slug}" already exists at ${filePath}\nEdit it directly or use a different name.`,
    }
  }

  mkdirSync(skillDir, { recursive: true })

  const today = new Date().toISOString().slice(0, 10)
  const template = `---
name: ${slug}
description: ${description || 'Describe what this skill does and when to use it.'}
category: general
status: working
tested-on: ${today}
metadata:
  author: intelligence360
  version: "1.0"
---

## ${description || name}

<!-- Describe the technique step by step -->

\`\`\`python
# Working code here
\`\`\`

## Key Rules
- What to do
- What NOT to do (avoid dead-ends)

## Edge Cases
- Any special cases to handle
`

  writeFileSync(filePath, template)
  const count = rebuildClaudeMd()

  return {
    type: 'text',
    value: [
      `✓ Skill created: ${filePath}`,
      `✓ Skills library updated (${count} skill${count === 1 ? '' : 's'} total)`,
      '',
      'Fill in the Method section with the working technique.',
      'Run /refreshskills after editing to update the global index.',
    ].join('\n'),
  }
}
