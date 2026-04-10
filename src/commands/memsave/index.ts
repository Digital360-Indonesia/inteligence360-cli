import type { Command } from '../../commands.js'

const memsave: Command = {
  type: 'local',
  name: 'memsave',
  description: 'Save a memory to persist across sessions. Usage: /memsave <text> [#tag1 #tag2]',
  immediate: true,
  load: () => import('./memsave.js'),
}

export default memsave
