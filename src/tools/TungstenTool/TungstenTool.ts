// Stub for internal Anthropic TungstenTool (not available in external builds)
import { z } from 'zod/v4'
import { buildTool } from '../../Tool.js'

export const TungstenTool = buildTool({
  name: 'Tungsten',
  description: 'Internal tool (unavailable in this build)',
  inputSchema: z.object({}),
  isEnabled: () => false,
  async * call() {
    throw new Error('TungstenTool is not available in this build')
  },
  renderResultForAssistant: () => '',
})
