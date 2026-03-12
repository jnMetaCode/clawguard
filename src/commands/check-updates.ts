// src/commands/check-updates.ts — /check-updates: check OpenClaw version and known vulnerabilities

import { execSync } from 'child_process'
import { existsSync, readFileSync } from 'fs'
import { join } from 'path'
import type { ShellWardConfig } from '../types'
import { resolveLocale } from '../types'

// Known vulnerability database (hardcoded, updated with plugin releases)
// Format: { version_range, severity, cve, description_zh, description_en }
const KNOWN_VULNS = [
  {
    affectedBelow: '2026.3.6',
    severity: 'HIGH',
    id: 'CG-2026-001',
    description_zh: 'tool_result_persist hook 可被绕过泄露敏感数据',
    description_en: 'tool_result_persist hook bypass may leak sensitive data',
  },
  {
    affectedBelow: '2026.3.4',
    severity: 'CRITICAL',
    id: 'CG-2026-002',
    description_zh: '插件系统缺少签名验证，可加载恶意插件',
    description_en: 'Plugin system lacks signature verification, allows malicious plugins',
  },
  {
    affectedBelow: '2026.3.2',
    severity: 'HIGH',
    id: 'CG-2026-003',
    description_zh: 'Gateway 默认绑定 0.0.0.0，未认证即可远程执行',
    description_en: 'Gateway binds 0.0.0.0 by default, allows unauthenticated remote execution',
  },
]

export function registerCheckUpdatesCommand(api: any, config: ShellWardConfig) {
  const locale = resolveLocale(config)

  api.registerCommand({
    name: 'check-updates',
    description: locale === 'zh'
      ? '🔄 检查 OpenClaw 版本和已知漏洞'
      : '🔄 Check OpenClaw version and known vulnerabilities',
    acceptsArgs: false,
    handler: () => {
      const zh = locale === 'zh'
      const lines: string[] = []

      lines.push(zh ? '🔄 **版本与漏洞检查**' : '🔄 **Version & Vulnerability Check**')
      lines.push('')

      // 1. Get OpenClaw version
      let currentVersion = 'unknown'
      try {
        const out = execSync('openclaw --version 2>&1', { timeout: 5000 }).toString().trim()
        // Extract version like "2026.3.8"
        const match = out.match(/(\d{4}\.\d+\.\d+)/)
        if (match) currentVersion = match[1]
      } catch { /* skip */ }

      lines.push(zh
        ? `### OpenClaw 版本: ${currentVersion}`
        : `### OpenClaw Version: ${currentVersion}`)
      lines.push('')

      // 2. Check ShellWard version
      let shellwardVersion = 'unknown'
      try {
        const pkgPath = join(__dirname, '../../package.json')
        if (existsSync(pkgPath)) {
          const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'))
          shellwardVersion = pkg.version || 'unknown'
        }
      } catch { /* skip */ }

      lines.push(zh
        ? `### ShellWard 版本: ${shellwardVersion}`
        : `### ShellWard Version: ${shellwardVersion}`)
      lines.push('')

      // 3. Check known vulnerabilities
      lines.push(zh ? '### 已知漏洞检查' : '### Known Vulnerability Check')

      if (currentVersion === 'unknown') {
        lines.push(zh
          ? '  ⚠️ 无法确定 OpenClaw 版本，请手动检查'
          : '  ⚠️ Cannot determine OpenClaw version, please check manually')
      } else {
        const affected = KNOWN_VULNS.filter(v => compareVersions(currentVersion, v.affectedBelow) < 0)
        if (affected.length === 0) {
          lines.push(zh
            ? '  ✅ 当前版本未发现已知漏洞'
            : '  ✅ No known vulnerabilities for current version')
        } else {
          for (const vuln of affected) {
            const icon = vuln.severity === 'CRITICAL' ? '🔴' : '🟡'
            const desc = zh ? vuln.description_zh : vuln.description_en
            lines.push(`  ${icon} **${vuln.id}** [${vuln.severity}]: ${desc}`)
            lines.push(zh
              ? `     影响版本: < ${vuln.affectedBelow} — 请升级 OpenClaw`
              : `     Affected: < ${vuln.affectedBelow} — please upgrade OpenClaw`)
          }
        }
      }
      lines.push('')

      // 4. Check Node.js version
      lines.push(zh ? '### 运行环境' : '### Runtime Environment')
      try {
        const nodeVer = process.version
        const major = parseInt(nodeVer.slice(1))
        if (major < 22) {
          lines.push(zh
            ? `  ⚠️ Node.js ${nodeVer} — OpenClaw 要求 >= 22.12，请升级`
            : `  ⚠️ Node.js ${nodeVer} — OpenClaw requires >= 22.12, please upgrade`)
        } else {
          lines.push(zh
            ? `  ✅ Node.js ${nodeVer}`
            : `  ✅ Node.js ${nodeVer}`)
        }
      } catch { /* skip */ }

      lines.push(`  ${zh ? '平台' : 'Platform'}: ${process.platform} ${process.arch}`)
      lines.push('')

      // 5. Recommendations
      lines.push('---')
      lines.push(zh
        ? '💡 **建议**: 定期运行 `/check-updates` 检查，及时升级到最新版本'
        : '💡 **Tip**: Run `/check-updates` regularly, upgrade to latest versions promptly')
      lines.push(zh
        ? '📖 关注 OpenClaw 安全公告: https://github.com/nicepkg/openclaw/security'
        : '📖 Follow OpenClaw security advisories: https://github.com/nicepkg/openclaw/security')

      return { text: lines.join('\n') }
    },
  })
}

/**
 * Compare two version strings like "2026.3.8" vs "2026.3.6"
 * Returns: negative if a < b, 0 if equal, positive if a > b
 */
function compareVersions(a: string, b: string): number {
  const pa = a.split('.').map(Number)
  const pb = b.split('.').map(Number)
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const diff = (pa[i] || 0) - (pb[i] || 0)
    if (diff !== 0) return diff
  }
  return 0
}
