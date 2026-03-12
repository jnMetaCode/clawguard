// src/audit-log.ts — JSONL audit log, zero dependencies

import { appendFileSync, chmodSync, mkdirSync, renameSync, statSync, writeFileSync } from 'fs'
import { join } from 'path'
import type { AuditEntry, ClawGuardConfig } from './types'

const LOG_DIR = join(process.env.HOME || '~', '.openclaw', 'clawguard')
const LOG_FILE = join(LOG_DIR, 'audit.jsonl')
const MAX_SIZE_BYTES = 100 * 1024 * 1024 // 100 MB

export class AuditLog {
  private config: ClawGuardConfig
  private rotating = false

  constructor(config: ClawGuardConfig) {
    this.config = config
    try {
      mkdirSync(LOG_DIR, { recursive: true, mode: 0o700 })
      // Ensure log file exists with restricted permissions (owner-only)
      try {
        statSync(LOG_FILE)
      } catch {
        writeFileSync(LOG_FILE, '', { mode: 0o600 })
      }
    } catch { /* directory may already exist */ }
  }

  write(entry: Omit<AuditEntry, 'ts' | 'mode'>): void {
    try {
      const record: AuditEntry = {
        ts: new Date().toISOString(),
        mode: this.config.mode,
        ...entry,
      }
      appendFileSync(LOG_FILE, JSON.stringify(record) + '\n', { mode: 0o600 })
      this.rotateIfNeeded()
    } catch (e: any) {
      // Log failure must not break plugin, but warn via stderr
      try { process.stderr.write(`[ClawGuard] audit log write failed: ${e?.message}\n`) } catch {}
    }
  }

  private rotateIfNeeded(): void {
    if (this.rotating) return
    try {
      const stat = statSync(LOG_FILE)
      if (stat.size > MAX_SIZE_BYTES) {
        this.rotating = true
        const ts = new Date().toISOString().replace(/[:.]/g, '-')
        renameSync(LOG_FILE, `${LOG_FILE}.${ts}.bak`)
        writeFileSync(LOG_FILE, '', { mode: 0o600 })
      }
    } catch { /* ignore */ } finally {
      this.rotating = false
    }
  }
}
