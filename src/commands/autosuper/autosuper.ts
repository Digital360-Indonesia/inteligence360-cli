import type { LocalCommandCall } from '../../types/command.js'
import { applyPermissionUpdate } from '../../utils/permissions/PermissionUpdate.js'

export const call: LocalCommandCall = async (_args, context) => {
  const current = context.getAppState().toolPermissionContext
  const isCurrentlyBypassed = current.mode === 'bypassPermissions'

  if (isCurrentlyBypassed) {
    // Turn OFF — restore default permission checks
    context.setAppState(prev => ({
      ...prev,
      toolPermissionContext: applyPermissionUpdate(prev.toolPermissionContext, {
        type: 'setMode',
        mode: 'default',
        destination: 'session',
      }),
    }))
    return {
      type: 'text',
      value: '🔒 Auto-permissions OFF — tool confirmations restored',
    }
  } else {
    // Turn ON — bypass all permission checks
    context.setAppState(prev => ({
      ...prev,
      toolPermissionContext: applyPermissionUpdate(prev.toolPermissionContext, {
        type: 'setMode',
        mode: 'bypassPermissions',
        destination: 'session',
      }),
    }))
    return {
      type: 'text',
      value: '⚡ Auto-permissions ON — all tool confirmations bypassed',
    }
  }
}
