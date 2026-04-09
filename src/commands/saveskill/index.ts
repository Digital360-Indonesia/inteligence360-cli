import type { Command } from '../../commands.js'

const saveskill: Command = {
  type: 'local',
  name: 'saveskill',
  description: 'Save a technique to the Intelligence360 Skills Library (~/.intelligence360/skills/)',
  argumentHint: '<name> <description>',
  immediate: true,
  load: () => import('./saveskill.js'),
}

export default saveskill
