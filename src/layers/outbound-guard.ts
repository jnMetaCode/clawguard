// src/layers/outbound-guard.ts — L6: Redact secrets from LLM responses + detect canary leaks
// Uses message_sending hook to inspect outbound messages before they reach the user

import { redactSensitive } from '../rules/sensitive-patterns'
import { getCanaryToken } from './prompt-guard'
import { resolveLocale } from '../types'
import type { ShellWardConfig } from '../types'
import type { AuditLog } from '../audit-log'

export function setupOutboundGuard(
  api: any,
  config: ShellWardConfig,
  log: AuditLog,
  enforce: boolean,
) {
  const locale = resolveLocale(config)

  api.on('message_sending', (event: any) => {
    const content = event.content
    if (!content || typeof content !== 'string') return undefined

    // 1. Check for canary token leak (system prompt exfiltration)
    const canary = getCanaryToken()
    if (canary && content.includes(canary)) {
      log.write({
        level: 'CRITICAL',
        layer: 'L6',
        action: 'block',
        detail: locale === 'zh'
          ? '检测到系统提示词泄露！Canary token 出现在输出中'
          : 'System prompt exfiltration detected! Canary token found in output',
        pattern: 'canary_leak',
      })
      if (enforce) {
        const warning = locale === 'zh'
          ? '⚠️ [ShellWard] 检测到安全异常，本次回复已被拦截。可能存在提示词注入攻击。'
          : '⚠️ [ShellWard] Security anomaly detected, this response was blocked. Possible prompt injection attack.'
        return { content: warning }
      }
    }

    // 2. Redact sensitive data from LLM response text
    const [redacted, findings] = redactSensitive(content)
    if (findings.length === 0) return undefined

    for (const f of findings) {
      log.write({
        level: 'HIGH',
        layer: 'L6',
        action: enforce ? 'redact' : 'detect',
        detail: `${f.name}: ${f.count} occurrence(s) in outbound message`,
        pattern: f.id,
      })
    }

    if (!enforce) return undefined

    const summary = findings.map(f => `${f.name}(${f.count})`).join(', ')
    const notice = locale === 'zh'
      ? `\n\n⚠️ [ShellWard] 回复中的敏感信息已自动脱敏: ${summary}`
      : `\n\n⚠️ [ShellWard] Sensitive data in response auto-redacted: ${summary}`

    return { content: redacted + notice }
  }, { name: 'shellward.outbound-guard', priority: 100 })

  api.logger.info('[ShellWard] L6 Outbound Guard enabled')
}
