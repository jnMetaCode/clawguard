// src/layers/tool-blocker.ts — L3 OpenClaw Adapter
// Thin adapter: wires OpenClaw's before_tool_call hook to ShellWard core engine
// Compat: falls back to tool_result_persist for post-execution detection if before_tool_call unavailable

import type { ShellWard } from '../core/engine'

export function setupToolBlocker(api: any, guard: ShellWard, enforce: boolean) {
  // Primary: pre-execution blocking via before_tool_call
  const hasBeforeToolCall = api.on('before_tool_call', (event: any) => {
    const tool = String(event.toolName || '')
    const args: Record<string, any> = (event.params && typeof event.params === 'object') ? event.params : {}

    const toolCheck = guard.checkTool(tool)
    if (!toolCheck.allowed && enforce) {
      return { block: true, blockReason: `🚫 [ShellWard] ${toolCheck.reason}` }
    }

    if (guard.isExecTool(tool)) {
      const cmd = String(args.command ?? args.cmd ?? '')
      const cmdCheck = guard.checkCommand(cmd, tool)
      if (!cmdCheck.allowed && enforce) {
        return { block: true, blockReason: `🚫 [ShellWard] ${cmdCheck.reason}` }
      }
    }

    const rawPath = String(args.path || args.file_path || args.filename || args.target || '')
    if (rawPath && guard.isWriteOrDeleteTool(tool)) {
      const op = /delete|remove/i.test(tool) ? 'delete' as const : 'write' as const
      const pathCheck = guard.checkPath(rawPath, op, tool)
      if (!pathCheck.allowed && enforce) {
        return { block: true, blockReason: `🚫 [ShellWard] ${pathCheck.reason}` }
      }
    }
  }, { name: 'shellward.tool-blocker', priority: 200 })

  // Fallback: post-execution detection via tool_result_persist
  // When before_tool_call is unavailable (some OpenClaw versions), we still detect
  // dangerous tool usage after the fact and log it for audit trail
  if (!hasBeforeToolCall) {
    api.on('tool_result_persist', (event: any) => {
      const msg = event.message
      if (!msg) return undefined
      const tool = String(msg.toolName || '')
      if (!tool) return undefined

      // Check if the tool itself is blocked
      const toolCheck = guard.checkTool(tool)
      if (!toolCheck.allowed) {
        guard.log.write({
          level: 'CRITICAL',
          layer: 'L3',
          action: 'detect',
          detail: guard.locale === 'zh'
            ? `⚠️ 高危工具已执行 (无法前置拦截): ${tool} — ${toolCheck.reason}`
            : `⚠️ Dangerous tool executed (pre-block unavailable): ${tool} — ${toolCheck.reason}`,
          tool,
        })
      }

      return undefined
    }, { name: 'shellward.tool-blocker-fallback', priority: 190 })

    api.logger.warn('[ShellWard] L3 Tool Blocker: before_tool_call hook unavailable, using post-execution detection')
  }

  api.logger.info('[ShellWard] L3 Tool Blocker enabled')
}
