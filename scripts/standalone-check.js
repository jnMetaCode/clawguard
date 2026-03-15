#!/usr/bin/env node
// 独立运行的安全检查 — 供 cron 或 CI 调用，无需启动 OpenClaw
// 用法: node scripts/standalone-check.js

import { readFileSync, existsSync } from 'fs'
import { join } from 'path'
import { homedir } from 'os'
import { execSync } from 'child_process'

const HOME = homedir()
const OPENCLAW_DIR = join(HOME, '.openclaw')
const SHELLWARD_DIR = join(OPENCLAW_DIR, 'shellward')

const LOCAL_VULNS = [
  { affectedBelow: '1.0.111', id: 'CVE-2025-59536', severity: 'HIGH' },
  { affectedBelow: '2.0.65', id: 'CVE-2026-21852', severity: 'MEDIUM' },
  { affectedBelow: '2026.2.7', id: 'GHSA-ff64-7w26-62rf', severity: 'HIGH' },
]

function compareVersions(a, b) {
  const pa = a.split('.').map(Number)
  const pb = b.split('.').map(Number)
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const diff = (pa[i] || 0) - (pb[i] || 0)
    if (diff !== 0) return diff
  }
  return 0
}

function getOpenClawVersion() {
  try {
    const out = execSync('openclaw --version 2>&1', { timeout: 5000 }).toString()
    const m = out.match(/(\d{4}\.\d+\.\d+|\d+\.\d+\.\d+)/)
    return m ? m[1] : 'unknown'
  } catch {
    return 'unknown'
  }
}

// Try load remote vuln DB from cache
let vulnDB = LOCAL_VULNS
try {
  const cachePath = join(SHELLWARD_DIR, 'vuln-db-cache.json')
  if (existsSync(cachePath)) {
    const cached = JSON.parse(readFileSync(cachePath, 'utf-8'))
    if (cached.vulns?.length > 0) vulnDB = cached.vulns
  }
} catch {}

const ocVer = getOpenClawVersion()
console.log('OpenClaw version:', ocVer)

const affected = vulnDB.filter(v => ocVer !== 'unknown' && compareVersions(ocVer, v.affectedBelow) < 0)
if (affected.length > 0) {
  console.log('⚠️ 发现已知漏洞:')
  affected.forEach(v => console.log(`  - ${v.id} [${v.severity}] 影响版本 < ${v.affectedBelow}`))
  process.exitCode = 1
} else {
  console.log('✅ 当前版本未发现已知漏洞')
}
