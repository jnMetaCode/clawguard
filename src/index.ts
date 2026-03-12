// src/index.ts — ClawGuard plugin entry point (v0.3.0)
// 8 defense layers + 6 slash commands + 1 security skill

import { AuditLog } from './audit-log'
import { setupPromptGuard } from './layers/prompt-guard'
import { setupOutputScanner } from './layers/output-scanner'
import { setupToolBlocker } from './layers/tool-blocker'
import { setupInputAuditor } from './layers/input-auditor'
import { setupSecurityGate } from './layers/security-gate'
import { setupOutboundGuard } from './layers/outbound-guard'
import { setupDataFlowGuard } from './layers/data-flow-guard'
import { setupSessionGuard } from './layers/session-guard'
import { registerAllCommands } from './commands/index'
import { DEFAULT_CONFIG, resolveLocale } from './types'
import type { ClawGuardConfig } from './types'

function mergeConfig(userConfig: Partial<ClawGuardConfig> | undefined): ClawGuardConfig {
  if (!userConfig) return { ...DEFAULT_CONFIG }

  // Validate mode
  const mode = userConfig.mode === 'audit' ? 'audit' : 'enforce'

  // Validate locale
  const validLocales = ['auto', 'zh', 'en'] as const
  const locale = validLocales.includes(userConfig.locale as any)
    ? (userConfig.locale as typeof validLocales[number])
    : DEFAULT_CONFIG.locale

  // Validate injectionThreshold: clamp to 0-100
  let threshold = userConfig.injectionThreshold ?? DEFAULT_CONFIG.injectionThreshold
  threshold = Math.max(0, Math.min(100, Math.round(threshold)))

  return {
    mode,
    locale,
    injectionThreshold: threshold,
    layers: {
      ...DEFAULT_CONFIG.layers,
      ...(userConfig.layers || {}),
    },
  }
}

export default {
  id: 'clawguard',

  register(api: any) {
    const config = mergeConfig(api.config)
    const log = new AuditLog(config)
    const enforce = config.mode === 'enforce'
    const locale = resolveLocale(config)

    const modeLabel = locale === 'zh'
      ? `模式: ${config.mode}`
      : `mode: ${config.mode}`
    api.logger.info(`[ClawGuard] Security plugin started (${modeLabel})`)

    // === Defense Layers (L1-L8) ===

    // L1: Prompt Guard (before_prompt_build — prependSystemContext for caching)
    if (config.layers.promptGuard) {
      setupPromptGuard(api, config, log)
    }

    // L2: Output Scanner (tool_result_persist — redact PII in tool results)
    if (config.layers.outputScanner) {
      setupOutputScanner(api, config, log, enforce)
    }

    // L3: Tool Blocker (before_tool_call — block dangerous commands/paths)
    if (config.layers.toolBlocker) {
      setupToolBlocker(api, config, log, enforce)
    }

    // L4: Input Auditor (before_tool_call + message_received — injection detection)
    if (config.layers.inputAuditor) {
      setupInputAuditor(api, config, log, enforce)
    }

    // L5: Security Gate (registerTool — defense in depth)
    if (config.layers.securityGate) {
      setupSecurityGate(api, config, log, enforce)
    }

    // L6: Outbound Guard (message_sending — redact PII in LLM responses + canary detection)
    if (config.layers.outboundGuard) {
      setupOutboundGuard(api, config, log, enforce)
    }

    // L7: Data Flow Guard (after_tool_call + before_tool_call — anti-exfiltration)
    if (config.layers.dataFlowGuard) {
      setupDataFlowGuard(api, config, log, enforce)
    }

    // L8: Session Guard (session_end + subagent_spawning — lifecycle security)
    if (config.layers.sessionGuard) {
      setupSessionGuard(api, config, log, enforce)
    }

    // === Slash Commands ===
    if (api.registerCommand) {
      registerAllCommands(api, config)
      api.logger.info('[ClawGuard] 6 commands registered: /security /audit /harden /scan-plugins /check-updates /cg')
    }

    // Count enabled layers
    const allLayers = ['promptGuard', 'outputScanner', 'toolBlocker', 'inputAuditor', 'securityGate', 'outboundGuard', 'dataFlowGuard', 'sessionGuard']
    const enabledCount = allLayers.filter(k => (config.layers as any)[k]).length

    api.logger.info(`[ClawGuard] ${enabledCount} defense layers active`)

    log.write({
      level: 'INFO',
      layer: 'L1',
      action: 'allow',
      detail: `ClawGuard v0.3.0 started with ${enabledCount} layers`,
    })
  },
}
