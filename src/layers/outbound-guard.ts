// src/layers/outbound-guard.ts — L6 OpenClaw Adapter
// Thin adapter: wires OpenClaw hooks to ShellWard core engine for outbound response scanning
// Compat: supports both old (message_sending) and new (message:sent) hook names

import type { ShellWard } from '../core/engine'

export function setupOutboundGuard(api: any, guard: ShellWard, enforce: boolean) {
  const handler = (event: any) => {
    const content = event.content
    if (!content || typeof content !== 'string') return undefined

    const result = guard.checkResponse(content)

    if (result.canaryLeak && enforce) {
      const warning = guard.locale === 'zh'
        ? '⚠️ [ShellWard] 检测到安全异常，本次回复已被拦截。可能存在提示词注入攻击。'
        : '⚠️ [ShellWard] Security anomaly detected, this response was blocked. Possible prompt injection attack.'
      return { content: warning }
    }

    return undefined
  }

  // Try new-style hook name first, then legacy
  const registered = api.on('message:sent', handler, { name: 'shellward.outbound-guard', priority: 100 })
  if (!registered) {
    api.on('message_sending', handler, { name: 'shellward.outbound-guard', priority: 100 })
  }

  api.logger.info('[ShellWard] L6 Outbound Guard enabled')
}
