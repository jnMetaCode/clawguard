// src/layers/session-guard.ts — L8 OpenClaw Adapter
// Thin adapter: wires OpenClaw's session_end + subagent_spawning hooks to ShellWard core engine

import type { ShellWard } from '../core/engine'

export function setupSessionGuard(api: any, guard: ShellWard, enforce: boolean) {
  api.on('session_end', () => {
    guard.log.write({
      level: 'INFO',
      layer: 'L8',
      action: 'detect',
      detail: guard.locale === 'zh'
        ? '会话结束 — 安全审计完成'
        : 'Session ended — security audit complete',
    })
  }, { name: 'shellward.session-end', priority: 50 })

  api.on('subagent_spawning', (event: any) => {
    const mode = event.mode || 'unknown'
    guard.log.write({
      level: 'MEDIUM',
      layer: 'L8',
      action: 'detect',
      detail: guard.locale === 'zh'
        ? `子 Agent 创建: mode=${mode}, agentId=${event.agentId || 'unknown'}`
        : `Subagent spawning: mode=${mode}, agentId=${event.agentId || 'unknown'}`,
    })
  }, { name: 'shellward.subagent-guard', priority: 100 })

  api.logger.info('[ShellWard] L8 Session Guard enabled')
}
