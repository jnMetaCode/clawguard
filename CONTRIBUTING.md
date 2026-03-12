# Contributing to ClawGuard

Thank you for your interest in contributing! ClawGuard welcomes contributions from everyone.

## How to Contribute

### Reporting Bugs

- Use [GitHub Issues](https://github.com/jnMetaCode/clawguard/issues)
- Include: OpenClaw version, Node.js version, steps to reproduce, expected vs actual behavior
- For security vulnerabilities, see [SECURITY.md](SECURITY.md) instead

### Suggesting Features

- Open a GitHub Issue with the `enhancement` label
- Describe the use case and why it benefits ClawGuard users

### Submitting Changes

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/my-feature`
3. Make your changes
4. Test with OpenClaw: `openclaw plugins list` should show ClawGuard loaded
5. Commit with a descriptive message
6. Push and open a Pull Request

### Code Style

- TypeScript, no build step (loaded by OpenClaw's jiti)
- Zero external dependencies — use only Node.js built-in modules
- All user-facing messages must be bilingual (EN + ZH)
- Security rules need both `description_zh` and `description_en`
- Use case-insensitive regex (`/i` flag) for all pattern matching

### Adding Detection Rules

**Injection rules** (`src/rules/injection-*.ts`):
- Include `id`, `name`, `pattern`, `riskScore`, and `category`
- Test with both English and Chinese inputs

**Dangerous commands** (`src/rules/dangerous-commands.ts`):
- Include `id`, `pattern` (with `/i` flag), `description_zh`, `description_en`
- Verify regex is not vulnerable to ReDoS

**Sensitive patterns** (`src/rules/sensitive-patterns.ts`):
- Add validator function for patterns that need verification (checksums, Luhn, etc.)
- Test for false positives

### Testing

Currently ClawGuard uses manual integration testing with OpenClaw:

```bash
# Verify plugin loads
openclaw plugins list

# Test dangerous command blocking
openclaw agent --local -m "run rm -rf /" --session-id test

# Check audit log
cat ~/.openclaw/clawguard/audit.jsonl | jq .
```

## License

By contributing, you agree that your contributions will be licensed under the Apache-2.0 License.
