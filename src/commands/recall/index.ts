import type { Command } from '../../commands.js'

const recall: Command = {
  type: 'local',
  name: 'recall',
  description: 'Search or browse persistent memory across sessions. Usage: /recall [query] or /recall stats',
  immediate: true,
  load: () => import('./recall.js'),
}

export default recall
