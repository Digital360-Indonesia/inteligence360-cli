import type { LocalCommandCall } from '../../types/command.js'
import { getMainLoopModel } from '../../utils/model/model.js'
import { startDashboardServer, PORT } from '../../server/dashboardServer.js'

let serverStarted = false

export const call: LocalCommandCall = async () => {
  if (!serverStarted) {
    startDashboardServer(getMainLoopModel())
    serverStarted = true
  }
  const url = `http://localhost:${PORT}`
  Bun.spawn(['open', url], { stdout: 'inherit', stderr: 'inherit' })
  return {
    type: 'text',
    value: `◈ Intelligence360 Command Center → ${url}`,
  }
}
