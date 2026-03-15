// src/layers/session-guard.ts — L8 OpenClaw Adapter
// Thin adapter: wires OpenClaw hooks to ShellWard core engine for session monitoring
// Compat: supports multiple hook naming conventions and graceful degradation

import type { ShellWard } from '../core/engine'

export function setupSessionGuard(api: any, guard: ShellWard, enforce: boolean) {
  // Session end: try new-style, then legacy, then command-based
  const sessionEndHandler = () => {
    guard.log.write({
      level: 'INFO',
      layer: 'L8',
      action: 'detect',
      detail: guard.locale === 'zh'
        ? '会话结束 — 安全审计完成'
        : 'Session ended — security audit complete',
    })
  }

  let registered = api.on('session:end', sessionEndHandler, { name: 'shellward.session-end', priority: 50 })
  if (!registered) {
    registered = api.on('session_end', sessionEndHandler, { name: 'shellward.session-end', priority: 50 })
  }
  if (!registered) {
    // Fallback: listen for command:new (session reset) as a proxy
    api.on('command:new', sessionEndHandler, { name: 'shellward.session-end-fallback', priority: 50 })
  }

  // Subagent monitoring: try multiple naming conventions
  const subagentHandler = (event: any) => {
    const mode = event.mode || 'unknown'
    guard.log.write({
      level: 'MEDIUM',
      layer: 'L8',
      action: 'detect',
      detail: guard.locale === 'zh'
        ? `子 Agent 创建: mode=${mode}, agentId=${event.agentId || 'unknown'}`
        : `Subagent spawning: mode=${mode}, agentId=${event.agentId || 'unknown'}`,
    })
  }

  // Try ContextEngine-style hook, then legacy
  let subRegistered = api.on('subagent:spawning', subagentHandler, { name: 'shellward.subagent-guard', priority: 100 })
  if (!subRegistered) {
    subRegistered = api.on('subagent_spawning', subagentHandler, { name: 'shellward.subagent-guard', priority: 100 })
  }
  if (!subRegistered) {
    api.logger.warn('[ShellWard] L8 Session Guard: subagent hooks unavailable, subagent monitoring disabled')
  }

  api.logger.info('[ShellWard] L8 Session Guard enabled')
}
