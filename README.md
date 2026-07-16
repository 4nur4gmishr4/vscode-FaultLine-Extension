# FaultLine

[![Build Status](https://img.shields.io/github/actions/workflow/status/4nur4gmishr4/vscode-FaultLine-Extension/ci.yml?branch=main&style=flat-square)](https://github.com/4nur4gmishr4/vscode-FaultLine-Extension/actions)
[![License: MIT](https://img.shields.io/github/license/4nur4gmishr4/vscode-FaultLine-Extension?style=flat-square)](https://opensource.org/licenses/MIT)
[![Issues](https://img.shields.io/github/issues/4nur4gmishr4/vscode-FaultLine-Extension?style=flat-square)](https://github.com/4nur4gmishr4/vscode-FaultLine-Extension/issues)
[![Stars](https://img.shields.io/github/stars/4nur4gmishr4/vscode-FaultLine-Extension?style=flat-square)](https://github.com/4nur4gmishr4/vscode-FaultLine-Extension/stargazers)

**Version 3.5.0** — AI-powered debugger / explainer for VS Code, with optional audio on failures and successes.

FaultLine intercepts failing terminal commands, build tasks, and (optionally) diagnostics. It can open an interactive AI analysis chat, play sounds, post HTTPS webhooks, and (opt-in) create Jira issues.

Developed by Anurag Mishra (4nur4gmishr4).

## Features

- **Interactive AI Debugging Chat**: Analyze the last failure with redacted command/output context; follow-up chat in a VS Code webview.
- **Multiple AI Providers**: GitHub Copilot (VS Code LM API, no key), OpenRouter, Groq, Gemini, Hugging Face, OpenAI, Anthropic, Mistral, Together AI, Cohere.
- **Reliable Terminal & Task Detection**: Terminal Shell Execution APIs, task process monitoring, optional diagnostics.
- **Audio Feedback with Controls**: Cooldown, max-per-minute, quiet hours, snooze, mute-when-focused, ignore patterns, custom packs/folders.
- **Status Bar**: Enable/sounds state and daily failure counter.
- **Secure Integrations**: SecretStorage for keys; HTTPS webhooks with SSRF + DNS private-IP re-check; opt-in Jira (HTTPS Atlassian hosts only).
- **Privacy-minded defaults**: Auto-open AI analysis **off**; Jira create **off**; PII redaction before AI egress.

### What’s new in 3.5.0

- Hardened shell detection, webhook SSRF (+ DNS re-check **and IP pin** on connect), PII, factory reset.
- Privacy defaults: AI auto-open and Jira create are **opt-in**.
- Slim VSIX: webview assets under `resources/vendor/` (no `node_modules` packaged).
- CI: lint, tests with coverage, compile, package smoke; release gated on the same.
- Branch filters fail closed when git branch is unknown.
- i18n wired for core command feedback; broad automated tests (incl. activate smoke).

## Installation

1. Install from the VS Code Marketplace (or Install from VSIX).
2. Command Palette → **FaultLine: Open Configuration**.
3. Choose AI provider (default **Copilot**) and save a key if needed.
4. Test sounds from the settings panel.
5. Optionally set `faultline.errorExplanation.autoShow` to `true` for automatic AI panel on failure.

## Commands

| Command | Purpose |
|---------|---------|
| FaultLine: Open Configuration | Settings webview |
| FaultLine: Analyze Last Failure | AI chat for last failure |
| FaultLine: Toggle Enable / Disable | Master switch |
| FaultLine: Show Welcome Screen | Welcome / first-run |
| FaultLine: Snooze | Temporary mute |
| FaultLine: Factory Reset | Settings + history + SecretStorage keys |
| FaultLine: Show Output Log | Output channel |

## Configuration (high level)

- `faultline.aiProvider` / `faultline.ai.model` / `faultline.aiSummary.enabled`
- `faultline.errorExplanation.enabled` / `faultline.errorExplanation.autoShow` (**default false**)
- `faultline.volume` / `faultline.soundPack` / `faultline.successSound` / `faultline.soundFolder`
- `faultline.cooldownMs` / `faultline.cooldownPerSource` / `faultline.maxPerMinute`
- `faultline.ignorePatterns` / `faultline.branchPatterns` (fail closed if git branch unknown)
- `faultline.notificationLevel` / mute / quiet hours / snooze
- `faultline.webhookUrl` (**https only**) / `faultline.webhookAllowedDomains`
- `faultline.jiraEnabled` (**default false**) / `jiraUrl` / `jiraProject` / `jiraEmail` + SecretStorage token

Advanced options: VS Code Settings → search `@ext:4nur4gmishr4.fahh`, or **Open all FaultLine settings** in the configuration panel.

## Develop & package

```bash
npm ci
npm run vendor:sync
npm run lint
npm test -- --coverage
npm run compile
npm run package:prod
```

See [CONTRIBUTING.md](./CONTRIBUTING.md), [ARCHITECTURE.md](./ARCHITECTURE.md), and [SECURITY.md](./SECURITY.md).

## License

MIT. Developed by Anurag Mishra (4nur4gmishr4).
