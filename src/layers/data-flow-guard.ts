// src/layers/data-flow-guard.ts — L7 OpenClaw Adapter
// Thin adapter: wires OpenClaw's after_tool_call + before_tool_call hooks to ShellWard core engine

import type { ShellWard } from '../core/engine'

export function setupDataFlowGuard(api: any, guard: ShellWard, enforce: boolean) {
  api.on('after_tool_call', (event: any) => {
    const toolName = String(event.toolName || '').toLowerCase()
    const params = (event.params && typeof event.params === 'object') ? event.params : {}
    const path = String(params.path || params.file_path || params.filename || params.target || '')

    if (guard.isReadTool(toolName) && path) {
      guard.trackFileRead(event.toolName, path)
    }
  }, { name: 'shellward.data-flow-read-tracker', priority: 50 })

  api.on('before_tool_call', (event: any) => {
    const toolName = String(event.toolName || '')
    const params = (event.params && typeof event.params === 'object') ? event.params : {}

    const result = guard.checkOutbound(toolName, params)
    if (!result.allowed && enforce) {
      return { block: true, blockReason: `🚫 [ShellWard] ${result.reason}` }
    }
  }, { name: 'shellward.data-flow-egress', priority: 250 })

  api.logger.info('[ShellWard] L7 Data Flow Guard enabled')
}
