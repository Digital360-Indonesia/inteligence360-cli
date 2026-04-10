import type { LocalCommandCall } from '../../types/command.js'
import { saveMemory, deleteMemory, clearAllMemories } from '../../intelligence360/memoryDB.js'

export const call: LocalCommandCall = async (args) => {
  const trimmed = args.trim()

  if (!trimmed) {
    return {
      type: 'text',
      value: [
        'Usage: /memsave <text> [#tag1 #tag2]',
        '       /memsave delete <id>',
        '       /memsave clear',
        '',
        'Examples:',
        '  /memsave The project uses Bun + React + Ink for the CLI #architecture',
        '  /memsave Client wants dark navy theme on all dashboards #preference',
        '  /memsave delete 42',
      ].join('\n'),
    }
  }

  // Delete a specific memory
  if (trimmed.startsWith('delete ')) {
    const id = parseInt(trimmed.slice(7).trim())
    if (isNaN(id)) return { type: 'text', value: 'Usage: /memsave delete <id>' }
    const ok = deleteMemory(id)
    return { type: 'text', value: ok ? `✓ Memory #${id} deleted` : `Memory #${id} not found` }
  }

  // Clear all
  if (trimmed === 'clear') {
    const count = clearAllMemories()
    return { type: 'text', value: `✓ Cleared ${count} memories` }
  }

  // Extract hashtags as tags
  const tagMatch = trimmed.match(/#[\w-]+/g)
  const tags = tagMatch ? tagMatch.map(t => t.slice(1)).join(',') : ''
  const content = trimmed.replace(/#[\w-]+/g, '').replace(/\s+/g, ' ').trim()

  if (!content) return { type: 'text', value: 'Nothing to save (content was empty after removing tags).' }

  const id = saveMemory(content, tags)
  return {
    type: 'text',
    value: `✓ Memory saved (id: ${id})${tags ? ` · tags: ${tags}` : ''}\n  "${content}"`,
  }
}
