// src/utils.ts — Cross-platform path helpers

import { homedir } from 'os'

/**
 * Get user home directory. Works on Windows (USERPROFILE), Linux/macOS (HOME).
 */
export function getHomeDir(): string {
  return homedir() || process.env.HOME || process.env.USERPROFILE || '~'
}
