import type { Command } from '../../commands.js'

const refreshskills: Command = {
  type: 'local',
  name: 'refreshskills',
  description: 'Rebuild CLAUDE.md from ~/.intelligence360/skills/ after manually adding/editing skill files',
  immediate: true,
  load: () => import('./refreshskills.js'),
}

export default refreshskills
