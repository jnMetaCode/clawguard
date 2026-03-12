# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/),
and this project adheres to [Semantic Versioning](https://semver.org/).

## [0.3.0] - 2026-03-12

### Added
- **L6 Outbound Guard**: Redacts PII from LLM responses via `message_sending` hook
- **L7 Data Flow Guard**: Detects data exfiltration chains (read sensitive file → send via network)
- **L8 Session Guard**: Session security audit + subagent monitoring
- **Canary tokens**: Injected in system prompt to detect prompt exfiltration
- **6 slash commands**: `/security`, `/audit`, `/harden`, `/scan-plugins`, `/check-updates`, `/cg`
- **Security guide skill**: Interactive deployment security assessment (`/security-guide`)
- Supply chain detection: Package install command monitoring
- Suspicious URL parameter detection

### Changed
- L1 Prompt Guard now uses `prependSystemContext` for prompt caching (saves tokens)
- Data flow guard Map capped at 500 entries to prevent memory exhaustion
- Audit log now outputs to stderr on write failures
- Security gate rejects empty action parameters

### Fixed
- Tool blocker: Added typeof check for command parameters
- chmod 777 regex now matches at end of string
- All type definitions updated for L6/L7/L8 layers

## [0.2.0] - 2026-03-11

### Added
- 13th Chinese injection rule: XML tag injection detection
- SSN validator to reject date-like false positives
- `splitCommands()` for command chaining attack detection (`;`, `&&`, `||`)
- Path normalization via `resolve()` to prevent `../` traversal bypass

### Fixed
- All 15 dangerous command patterns: added case-insensitive `/i` flag
- All 12 protected path patterns: added case-insensitive `/i` flag
- L1 return type: `prependSystemContext` instead of `systemPrompt`
- L2 event structure: `event.message.content[]` array processing
- L3/L4 field names: `event.toolName`/`event.params` per OpenClaw API
- Config validation: mode, locale, and threshold clamping

## [0.1.0] - 2026-03-11

### Added
- Initial release with 5 defense layers (L1-L5)
- L1 Prompt Guard: Security rules injection via `before_prompt_build`
- L2 Output Scanner: PII/secret redaction via `tool_result_persist`
- L3 Tool Blocker: Dangerous command/path blocking via `before_tool_call`
- L4 Input Auditor: Prompt injection detection (12 EN + 12 ZH rules)
- L5 Security Gate: Defense-in-depth tool via `registerTool`
- Chinese PII detection: ID card (checksum), phone, bank card (Luhn)
- Global PII detection: API keys, JWT, passwords, SSN, credit cards, emails
- 15 dangerous command rules
- 12 protected path rules
- JSONL audit log with 100MB auto-rotation
- Bilingual support (EN/ZH) with auto-detection
- Dual mode: enforce (block+log) / audit (log only)
