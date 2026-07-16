# Changelog

[![Build Status](https://img.shields.io/github/actions/workflow/status/4nur4gmishr4/vscode-FaultLine-Extension/ci.yml?branch=main&style=flat-square)](https://github.com/4nur4gmishr4/vscode-FaultLine-Extension/actions)
[![License: MIT](https://img.shields.io/github/license/4nur4gmishr4/vscode-FaultLine-Extension?style=flat-square)](https://opensource.org/licenses/MIT)
[![Issues](https://img.shields.io/github/issues/4nur4gmishr4/vscode-FaultLine-Extension?style=flat-square)](https://github.com/4nur4gmishr4/vscode-FaultLine-Extension/issues)
[![Stars](https://img.shields.io/github/stars/4nur4gmishr4/vscode-FaultLine-Extension?style=flat-square)](https://github.com/4nur4gmishr4/vscode-FaultLine-Extension/stargazers)

All notable changes to the FaultLine extension will be documented in this file.

## [3.5.0]

Production release: terminal detection, security hardening, privacy defaults, slim packaging, tests, and CI (target **1000/1000** ship quality).

### Final hardening (still 3.5.0)
- Webhook TCP **IP pin** after DNS (connectHost + TLS SNI) to close rebinding TOCTOU.
- Command messages use **i18n** `t()` for toggles, snooze, reset, factory reset, sound UX.
- Integration activate smoke + expanded unit tests (sound path sandbox, status bar, parseFailureEvent, i18n).

### Security & reliability
- Terminal Shell Execution: `execution.read()`, `commandLine`, end-event `exitCode`; concurrent buffers via `WeakMap`.
- PII redaction on labels/output before AI, history, and outbound paths (JWTs, GitHub tokens, Azure keys, PEM, emails, URL credentials).
- Webhook SSRF: **HTTPS only**, host allowlist, DNS private-IP re-check on every attempt (including retries); dispose clears retries.
- Private-host checks use `net.isIP` (no false blocks on hostnames like `facebook.com`).
- Factory reset wipes settings, history/state, snooze, and **SecretStorage API keys**.
- Jira: opt-in (`faultline.jiraEnabled`, default **false**), **HTTPS only**, Atlassian hosts, origin-only URL, rate limit, SecretStorage token.
- Safe pack sound test: basenames under `resources/packs/{default,success}` only.
- Settings allowlist + provider key validation; Error Analysis schema/size caps.
- Success sounds respect full mute rules (disabled, snooze, quiet hours, mute-when-focused).

### Privacy defaults
- `faultline.errorExplanation.autoShow` default **false** (on-demand AI).
- `faultline.aiSummary.enabled` default **false**.
- AI summary logs length at debug only (no model text at info).

### Config & behavior
- Enforced: `cooldownMs` / `cooldownPerSource` / `maxPerMinute`, `ignorePatterns`, `soundFolder`, `notificationLevel`.
- Branch patterns fail closed when git branch is unknown; applied to all failure sources.
- Detectors use live `configFn()` (no rebind on every settings change).
- History stores sanitized, capped `output` for last-failure AI.
- Status bar daily counter via persistent state.

### Packaging & CI
- Webview assets in `resources/vendor/` (`npm run vendor:sync`); **no `node_modules` in VSIX** (~22 files).
- CI: lint, test+coverage, compile, Linux VSIX smoke; release runs the same before package.
- TruffleHog action pinned; multi-OS CI.
- Categories/keywords; nls for command titles.

### Testing
- Unit tests for detectors, `handleFailure`, SSRF/DNS/Jira, factory reset, settings allowlist, AI registry + mocked chat HTTP contracts.

### Upgrade notes
- Webhooks must use `https://`. Private hosts need `faultline.webhookAllowedDomains`.
- Factory Reset deletes API keys — reconfigure after reset.
- Sound test from Settings only accepts built-in pack filenames.
- Default `faultline.cooldownMs` is **2000**; set `0` for no cooldown.

## [3.1.0]

### Added
- Full interactive AI chat in Error Explanation.
- Context-aware debugging with terminal command + output.
- Enhanced webview UI (chat bubbles, typing indicators).
