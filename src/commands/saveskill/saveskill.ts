import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'fs'
import { homedir } from 'os'
import { join } from 'path'
import type { LocalCommandCall } from '../../types/command.js'

const SKILLS_DIR = join(homedir(), '.intelligence360', 'skills')
const CLAUDE_MD = join(homedir(), '.claude', 'CLAUDE.md')

export function rebuildClaudeMd() {
  mkdirSync(SKILLS_DIR, { recursive: true })

  const skills = existsSync(SKILLS_DIR)
    ? readdirSync(SKILLS_DIR).filter(f => f.endsWith('.md')).sort()
    : []

  // Build skills block
  let skillsBlock = '<!-- SKILLS:START -->\n'
  if (skills.length === 0) {
    skillsBlock += '_No skills saved yet. Use /saveskill to add one._\n'
  } else {
    for (const file of skills) {
      const content = readFileSync(join(SKILLS_DIR, file), 'utf8')
      // Extract title line (first # heading)
      const titleMatch = content.match(/^#\s+(.+)$/m)
      const title = titleMatch ? titleMatch[1] : file.replace('.md', '')
      // Extract first code block
      const codeMatch = content.match(/```[\w]*\n([\s\S]*?)```/)
      const code = codeMatch ? codeMatch[0] : ''
      // Extract first non-heading, non-code paragraph as summary
      const summaryMatch = content.match(/\*\*Method\*\*[^\n]*\n+([^\n#`*].+)/)
      const summary = summaryMatch ? summaryMatch[1].trim() : ''

      skillsBlock += `### ${file.replace('.md', '')}\n`
      if (summary) skillsBlock += `${summary}\n`
      if (code) skillsBlock += `${code}\n`
      skillsBlock += `Full details: ${SKILLS_DIR}/${file}\n\n`
    }
  }
  skillsBlock += '<!-- SKILLS:END -->'

  // Update or create CLAUDE.md
  mkdirSync(join(homedir(), '.claude'), { recursive: true })
  let existing = existsSync(CLAUDE_MD) ? readFileSync(CLAUDE_MD, 'utf8') : ''

  if (existing.includes('<!-- SKILLS:START -->')) {
    // Replace existing block
    existing = existing.replace(/<!-- SKILLS:START -->[\s\S]*?<!-- SKILLS:END -->/m, skillsBlock)
  } else {
    // Append
    existing = existing.trimEnd() + '\n\n## Skills Library\n\n' + skillsBlock + '\n'
  }

  writeFileSync(CLAUDE_MD, existing)
  return skills.length
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
        'Example: /saveskill twitter-scrape Download tweets without API key',
        '',
        'This creates ~/.intelligence360/skills/<name>.md',
        'Then describe the technique and I\'ll fill in the skill file.',
      ].join('\n'),
    }
  }

  const description = parts.slice(1).join(' ')
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
  const filePath = join(SKILLS_DIR, `${slug}.md`)

  mkdirSync(SKILLS_DIR, { recursive: true })

  if (existsSync(filePath)) {
    return {
      type: 'text',
      value: `Skill "${slug}" already exists at ${filePath}\nEdit it directly or use a different name.`,
    }
  }

  const today = new Date().toISOString().slice(0, 10)
  const template = `# Skill: ${description || name}

**Category:** General
**Added:** ${today}
**Status:** Working

## Method

<!-- Describe the technique here -->

\`\`\`python
# Working code here
\`\`\`

## Notes
- Key insight 1
- What NOT to do (avoid dead-ends)
`

  writeFileSync(filePath, template)
  const count = rebuildClaudeMd()

  return {
    type: 'text',
    value: [
      `✓ Skill file created: ${filePath}`,
      `✓ CLAUDE.md updated (${count} skill${count === 1 ? '' : 's'} total)`,
      '',
      'Now fill in the Method section with the working technique.',
      'It will be available in every future session automatically.',
    ].join('\n'),
  }
}
