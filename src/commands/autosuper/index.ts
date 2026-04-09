import type { Command } from '../../commands.js'

const autosuper: Command = {
  type: 'local',
  name: 'autosuper',
  description: 'Toggle auto-permissions (bypass all tool confirmations)',
  immediate: true,
  load: () => import('./autosuper.js'),
}

export default autosuper
