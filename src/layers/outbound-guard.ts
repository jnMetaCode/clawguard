// src/layers/outbound-guard.ts — L6 OpenClaw Adapter
// Thin adapter: wires OpenClaw's message_sending hook to ShellWard core engine

import type { ShellWard } from '../core/engine'

export function setupOutboundGuard(api: any, guard: ShellWard, enforce: boolean) {
  api.on('message_sending', (event: any) => {
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
  }, { name: 'shellward.outbound-guard', priority: 100 })

  api.logger.info('[ShellWard] L6 Outbound Guard enabled')
}
