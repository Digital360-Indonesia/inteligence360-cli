import type { LocalCommandCall } from '../../types/command.js'
import { searchMemories, getRecentMemories, getMemoryStats, formatMemoryForContext } from '../../intelligence360/memoryDB.js'

export const call: LocalCommandCall = async (args) => {
  const query = args.trim()

  if (query === 'stats') {
    const stats = getMemoryStats()
    const oldest = stats.oldest ? new Date(stats.oldest * 1000).toISOString().slice(0, 10) : 'n/a'
    const newest = stats.newest ? new Date(stats.newest * 1000).toISOString().slice(0, 10) : 'n/a'
    return {
      type: 'text',
      value: [
        '◈ Memory Stats',
        `  Total entries : ${stats.total}`,
        `  Oldest        : ${oldest}`,
        `  Newest        : ${newest}`,
      ].join('\n'),
    }
  }

  const entries = query ? searchMemories(query, 15) : getRecentMemories(15)

  if (!entries.length) {
    return {
      type: 'text',
      value: query
        ? `No memories found matching "${query}". Use /memsave <text> to save something.`
        : 'No memories saved yet. Use /memsave <text> to save something.',
    }
  }

  const header = query ? `◈ Memory results for "${query}" (${entries.length})` : `◈ Recent memories (${entries.length})`
  return {
    type: 'text',
    value: [header, '', formatMemoryForContext(entries)].join('\n'),
  }
}
