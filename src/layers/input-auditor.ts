// src/layers/input-auditor.ts — L4 OpenClaw Adapter
// Thin adapter: wires OpenClaw's before_tool_call + message_received hooks to ShellWard core engine

import type { ShellWard } from '../core/engine'

export function setupInputAuditor(api: any, guard: ShellWard, enforce: boolean) {
  api.on('before_tool_call', (event: any) => {
    const args: Record<string, any> = (event.params && typeof event.params === 'object') ? event.params : {}
    const texts = guard.extractTextFields(args)
    if (texts.length === 0) return

    const toolName = String(event.toolName || '')
    const threshold = guard.getInjectionThreshold(toolName)
    const fullText = texts.join('\n')
    const result = guard.checkInjection(fullText, { source: toolName, threshold })

    if (!result.safe && enforce) {
      const reason = guard.locale === 'zh'
        ? `检测到可能的提示词注入攻击!\n风险评分: ${result.score}/100\n匹配规则: ${result.matched.map(m => m.name).join(', ')}`
        : `Potential prompt injection detected!\nRisk score: ${result.score}/100\nMatched: ${result.matched.map(m => m.name).join(', ')}`
      return { block: true, blockReason: `⚠️ [ShellWard] ${reason}` }
    }
  }, { name: 'shellward.input-auditor', priority: 300 })

  api.on('message_received', (event: any) => {
    const content = typeof event.content === 'string' ? event.content : ''
    if (!content) return
    guard.checkInjection(content, { source: 'message' })
  }, { name: 'shellward.message-auditor', priority: 100 })

  api.logger.info(`[ShellWard] L4 Input Auditor enabled`)
}
