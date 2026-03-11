// src/layers/session-guard.ts — L8: Session lifecycle security
// Uses: session_end (security summary), subagent_spawning (enforce policies)

import { resolveLocale } from '../types'
import type { ClawGuardConfig } from '../types'
import type { AuditLog } from '../audit-log'

export function setupSessionGuard(
  api: any,
  config: ClawGuardConfig,
  log: AuditLog,
  enforce: boolean,
) {
  const locale = resolveLocale(config)

  // === Session end: generate security summary ===
  api.on('session_end', () => {
    log.write({
      level: 'INFO',
      layer: 'L8',
      action: 'detect',
      detail: locale === 'zh'
        ? '会话结束 — 安全审计完成'
        : 'Session ended — security audit complete',
    })
  }, { name: 'clawguard.session-end', priority: 50 })

  // === Subagent spawning: enforce security policies ===
  api.on('subagent_spawning', (event: any) => {
    const mode = event.mode || 'unknown'

    log.write({
      level: 'MEDIUM',
      layer: 'L8',
      action: 'detect',
      detail: locale === 'zh'
        ? `子 Agent 创建: mode=${mode}, agentId=${event.agentId || 'unknown'}`
        : `Subagent spawning: mode=${mode}, agentId=${event.agentId || 'unknown'}`,
    })

    // In strict mode, could block subagent spawning entirely
    // For now, just audit
  }, { name: 'clawguard.subagent-guard', priority: 100 })

  api.logger.info('[ClawGuard] L8 Session Guard enabled')
}
