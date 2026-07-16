# FaultLine Architecture

[![Build Status](https://img.shields.io/github/actions/workflow/status/4nur4gmishr4/vscode-FaultLine-Extension/ci.yml?branch=main&style=flat-square)](https://github.com/4nur4gmishr4/vscode-FaultLine-Extension/actions)
[![License: MIT](https://img.shields.io/github/license/4nur4gmishr4/vscode-FaultLine-Extension?style=flat-square)](https://opensource.org/licenses/MIT)

FaultLine is a modular VS Code extension that intercepts development failures, plays optional audio feedback, and offers AI-assisted explanation. Version **3.5.0** emphasizes production hardening: terminal integration, config fidelity, SSRF/Jira safety, privacy defaults, slim VSIX packaging, and automated CI/release gates.

## Layering

```
src/
  extension.ts                 # activate / config reload / migrations
  application/runtime/         # FaultLineRuntime — handleFailure / success
  application/core/            # AudioPlayer, SoundResolver, WSL helpers
  infrastructure/detectors/    # task, terminal/shell, diagnostics
  infrastructure/services/     # AI providers, AIService, WebhookService
  infrastructure/security/     # PII sanitize
  infrastructure/state/        # daily counter, version, migrations
  presentation/                # commands, webviews, status bar
  shared/                      # config, secrets, history, scheduler, logger
```

## Core components

### Detectors

- **TerminalDetector**: On shell start, `execution.read()` into a WeakMap buffer (capped). On end, exitCode + commandLine → `shell` failures. Terminal close → `terminal` source.
- **TaskDetector**: Task process start/end; branch filter (fail-closed if branch unknown); optional success sounds.
- **DiagnosticDetector**: Debounced diagnostics; threshold; cleanup interval disposed cleanly.

Detectors register once at activation and use a live `configFn()`. Config changes do **not** re-subscribe by default (`ConfigManager.affectsDetectors()` returns false). Branch patterns are also enforced in `handleFailure` for all sources.

### Failure pipeline

```
detector → handleFailure
  → scheduler.isMuted (enabled / snooze / quiet hours / mute-when-focused)
  → PII sanitize label/output
  → ignorePatterns / branchPatterns
  → sound (if enabled & not sound-rate-limited)
  → optional AI summary (debug log only)
  → webhook + optional Jira
  → history (sanitized, output capped)
  → daily counter / status bar / notification
  → optional auto AI panel (default off)
```

### Audio

Cross-platform playback (Windows VBS + cscript; macOS afplay; Linux ffplay/paplay/aplay). Pack sounds under `resources/packs`. `faultline.testSound` only allows basenames under packs.

### AI

`AIService` → provider registry (`aiProviders.ts`). Prompts re-sanitized at egress. Keys per-call from SecretStorage. Copilot uses `vscode.lm`.

### Webhooks & Jira

- Webhooks: HTTPS only, host allowlist, DNS private re-check **per attempt**, connect **IP pin** + TLS SNI.
- Jira: opt-in, HTTPS, Atlassian hosts, request URL from `origin` only, rate limit, SecretStorage token.

### Configuration & webviews

`ConfigManager` validates/clamps settings. Settings webview allowlists keys. Error Analysis validates message schema and length caps. Webview assets load from **`resources/vendor/`** (synced by `npm run vendor:sync`); `localResourceRoots` is `resources` only.

### State & history

- **StateStore**: daily fail count, last version, migration flags.
- **HistoryManager**: ring buffer in globalState for last-failure AI / factory reset.

## Packaging

| Step | Output |
|------|--------|
| `vendor:sync` | Copy toolkit + codicons → `resources/vendor/` |
| `compile` | esbuild bundle → `out/extension.js` |
| `vsce package` | No `node_modules`; slim VSIX |

## Related docs

- [SECURITY.md](./SECURITY.md)
- [CONTRIBUTING.md](./CONTRIBUTING.md)
- [CHANGELOG.md](./CHANGELOG.md)
