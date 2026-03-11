// src/commands/index.ts — Register all ClawGuard commands

import type { ClawGuardConfig } from '../types'
import { resolveLocale } from '../types'
import { registerSecurityCommand } from './security'
import { registerAuditCommand } from './audit'
import { registerHardenCommand } from './harden'
import { registerScanPluginsCommand } from './scan-plugins'
import { registerCheckUpdatesCommand } from './check-updates'

export function registerAllCommands(api: any, config: ClawGuardConfig) {
  const locale = resolveLocale(config)

  // Register individual commands
  registerSecurityCommand(api, config)
  registerAuditCommand(api, config)
  registerHardenCommand(api, config)
  registerScanPluginsCommand(api, config)
  registerCheckUpdatesCommand(api, config)

  // Register /cg shortcut with help
  api.registerCommand({
    name: 'cg',
    description: locale === 'zh'
      ? '🛡️ ClawGuard 安全命令帮助'
      : '🛡️ ClawGuard security command help',
    acceptsArgs: false,
    handler: () => ({
      text: locale === 'zh' ? `🛡️ **ClawGuard 快捷命令**

| 命令 | 说明 |
|------|------|
| \`/security\` | 安全状态总览（防御层、审计统计、系统检查） |
| \`/audit [数量] [过滤]\` | 查看审计日志 (过滤: block/redact/critical/high) |
| \`/harden\` | 安全扫描 · \`/harden fix\` 自动修复权限 |
| \`/scan-plugins\` | 扫描已安装插件的安全风险 |
| \`/check-updates\` | 检查 OpenClaw 版本和已知漏洞 |

**当前防御层 (8层):**
L1 提示注入 · L2 输出脱敏 · L3 工具拦截 · L4 注入检测
L5 安全门 · L6 回复脱敏 · L7 数据流监控 · L8 会话安全`
        : `🛡️ **ClawGuard Quick Commands**

| Command | Description |
|---------|-------------|
| \`/security\` | Security status overview (layers, audit stats, system checks) |
| \`/audit [count] [filter]\` | View audit log (filter: block/redact/critical/high) |
| \`/harden\` | Security scan · \`/harden fix\` to auto-fix permissions |
| \`/scan-plugins\` | Scan installed plugins for security risks |
| \`/check-updates\` | Check OpenClaw version and known vulnerabilities |

**Active Defense Layers (8):**
L1 Prompt Guard · L2 Output Scanner · L3 Tool Blocker · L4 Input Auditor
L5 Security Gate · L6 Outbound Guard · L7 Data Flow Guard · L8 Session Guard`,
    }),
  })
}
