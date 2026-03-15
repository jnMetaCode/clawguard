// src/layers/data-flow-guard.ts — L7 OpenClaw Adapter
// Thin adapter: wires OpenClaw hooks to ShellWard core engine for data flow tracking
// Compat: uses tool_result_persist as fallback when after_tool_call/before_tool_call unavailable

import type { ShellWard } from '../core/engine'

export function setupDataFlowGuard(api: any, guard: ShellWard, enforce: boolean) {
  let hasReadTracker = false
  let hasEgressBlock = false

  // Primary read tracker: after_tool_call
  hasReadTracker = api.on('after_tool_call', (event: any) => {
    const toolName = String(event.toolName || '').toLowerCase()
    const params = (event.params && typeof event.params === 'object') ? event.params : {}
    const path = String(params.path || params.file_path || params.filename || params.target || '')

    if (guard.isReadTool(toolName) && path) {
      guard.trackFileRead(event.toolName, path)
    }
  }, { name: 'shellward.data-flow-read-tracker', priority: 50 })

  // Primary egress block: before_tool_call
  hasEgressBlock = api.on('before_tool_call', (event: any) => {
    const toolName = String(event.toolName || '')
    const params = (event.params && typeof event.params === 'object') ? event.params : {}

    const result = guard.checkOutbound(toolName, params)
    if (!result.allowed && enforce) {
      return { block: true, blockReason: `🚫 [ShellWard] ${result.reason}` }
    }
  }, { name: 'shellward.data-flow-egress', priority: 250 })

  // Fallback: tool_result_persist for both read tracking and egress detection
  // When after_tool_call/before_tool_call are unavailable, we use tool_result_persist
  // which fires for every tool result before it's persisted to transcript
  if (!hasReadTracker || !hasEgressBlock) {
    api.on('tool_result_persist', (event: any) => {
      const msg = event.message
      if (!msg) return undefined
      const toolName = String(msg.toolName || '')
      if (!toolName) return undefined
      const toolLower = toolName.toLowerCase()

      // Fallback read tracking: scan tool results for PII to detect sensitive data access
      // The L2 output-scanner already does scanData() which calls markSensitiveData()
      // So read tracking is covered. Here we also track file reads by tool name.
      if (!hasReadTracker && guard.isReadTool(toolLower)) {
        // We don't have the file path from tool_result_persist,
        // but L2's scanData already marks sensitive data when PII is found in results
        guard.log.write({
          level: 'INFO',
          layer: 'L7',
          action: 'detect',
          detail: `Read tool executed: ${toolName} (tracking via result scan)`,
          tool: toolName,
        })
      }

      // Fallback egress detection: check if an outbound tool was used after sensitive data
      if (!hasEgressBlock) {
        // We can't block here (tool already ran), but we detect and log
        const fakeParams: Record<string, any> = {}
        const result = guard.checkOutbound(toolName, fakeParams)
        if (!result.allowed) {
          guard.log.write({
            level: 'CRITICAL',
            layer: 'L7',
            action: 'detect',
            detail: guard.locale === 'zh'
              ? `⚠️ 数据外泄检测 (无法前置拦截): ${toolName} 在访问敏感数据后执行了外发操作`
              : `⚠️ Data exfiltration detected (pre-block unavailable): ${toolName} sent data after sensitive access`,
            tool: toolName,
            pattern: 'data_exfil_chain',
          })
        }
      }

      return undefined
    }, { name: 'shellward.data-flow-fallback', priority: 90 })

    if (!hasReadTracker) {
      api.logger.warn('[ShellWard] L7 Data Flow Guard: after_tool_call unavailable, using result-based tracking')
    }
    if (!hasEgressBlock) {
      api.logger.warn('[ShellWard] L7 Data Flow Guard: before_tool_call unavailable, using post-execution detection')
    }
  }

  api.logger.info('[ShellWard] L7 Data Flow Guard enabled')
}
