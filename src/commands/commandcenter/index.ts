import type { Command } from '../../commands.js'

const commandcenter: Command = {
  type: 'local',
  name: 'commandcenter',
  aliases: ['ui', 'dashboard'],
  description: 'Open Intelligence360 Command Center in browser',
  immediate: true,
  load: () => import('./commandcenter.js'),
}

export default commandcenter
