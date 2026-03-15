#!/bin/bash
# ShellWard 定时安全检查 — 可加入 crontab 每日自动运行
# 用法: crontab -e 添加:
#   0 9 * * * /path/to/shellward/scripts/cron-security-check.sh >> ~/.openclaw/shellward/cron.log 2>&1

set -e
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
LOG_DIR="${HOME}/.openclaw/shellward"
mkdir -p "$LOG_DIR"

cd "$PROJECT_DIR"

echo "=== $(date -Iseconds) ShellWard 定时安全检查 ==="

# 1. 运行 OpenClaw 内的 /check-updates 等价逻辑（通过 openclaw 交互或直接调用）
# 由于 openclaw 无 headless 模式，这里用 npx 执行一个简化的检查脚本
if command -v node &>/dev/null; then
  if [ -f "$PROJECT_DIR/scripts/standalone-check.js" ]; then
    node "$PROJECT_DIR/scripts/standalone-check.js" 2>/dev/null || true
  fi
fi

# 2. 检查审计日志是否有近期 CRITICAL 事件
AUDIT_FILE="$LOG_DIR/audit.jsonl"
if [ -f "$AUDIT_FILE" ]; then
  CRITICAL_COUNT=$(grep -c '"level":"CRITICAL"' "$AUDIT_FILE" 2>/dev/null || echo 0)
  BLOCK_COUNT=$(grep -c '"action":"block"' "$AUDIT_FILE" 2>/dev/null || echo 0)
  echo "  审计统计: CRITICAL=$CRITICAL_COUNT, 拦截=$BLOCK_COUNT"
  if [ "$CRITICAL_COUNT" -gt 10 ]; then
    echo "  ⚠️ CRITICAL 事件较多，建议查看 /audit critical"
  fi
fi

# 3. 检查 OpenClaw 版本（若已安装）
if command -v openclaw &>/dev/null; then
  OC_VER=$(openclaw --version 2>/dev/null | head -1)
  echo "  OpenClaw: $OC_VER"
fi

echo "=== 检查完成 ==="
