# Changelog

<p align="center">
  <a href="https://github.com/4nur4gmishr4/vscode-FaultLine-Extension/actions"><img src="https://img.shields.io/github/actions/workflow/status/4nur4gmishr4/vscode-FaultLine-Extension/ci.yml?branch=main&style=flat-square" alt="CI" /></a>
  <a href="https://github.com/4nur4gmishr4/vscode-FaultLine-Extension/releases"><img src="https://img.shields.io/github/v/release/4nur4gmishr4/vscode-FaultLine-Extension?style=flat-square" alt="Release" /></a>
  <img src="https://img.shields.io/badge/ship-1000%2F1000-brightgreen?style=flat-square" alt="1000/1000" />
</p>

All notable changes to **FaultLine** are listed here.  
Newest first. Written for humans first, engineers second.

---

## [3.5.0] — Production release

**The production bar.** Terminal truth, privacy defaults, hard security, slim package, serious tests.

📦 [GitHub Release v3.5.0](https://github.com/4nur4gmishr4/vscode-FaultLine-Extension/releases/tag/v3.5.0) · 🏷️ tag `v3.5.0`

### For everyone

- **More reliable failure detection** for terminals and tasks  
- **Safer by default:** AI does not auto-open; Jira does not auto-create tickets  
- **Factory Reset** clears settings, history, **and API keys**  
- **Smaller, cleaner install package** (no huge dependency tree inside the VSIX)  
- Optional sounds, status bar counter, snooze — still there, better behaved  

### For power users

- Webhooks: **HTTPS only**, private hosts blocked unless allowlisted  
- Ignore patterns, cooldowns, max-per-minute, quiet hours, branch filters  
- Branch filter **fails closed** if git branch cannot be read  
- Jira opt-in with rate limit and Atlassian hosts only  

### For engineers

| Area | Highlights |
|------|------------|
| Terminal | `execution.read()`, `commandLine`, end `exitCode`, WeakMap concurrency, output cap |
| Security | PII sanitize (label + output + AI egress); SSRF DNS re-check; **connect IP pin + SNI**; SecretStorage |
| Privacy | `errorExplanation.autoShow` default **false**; `aiSummary.enabled` default **false**; no AI text at `info` |
| Packaging | `resources/vendor/*` via `vendor:sync`; VSIX ~22 files; CI blocks packaging `coverage/` / `src/` / `node_modules/` |
| Tests | 89 automated tests — detectors, handleFailure, SSRF/Jira, factory reset, AI fetch mocks, i18n, activate smoke |
| CI/CD | Multi-OS CI; release on `v*` tags; CodeQL + pinned TruffleHog |
| i18n | Core command toasts use `t()` |

### Upgrade notes

| If you used… | Do this |
|--------------|---------|
| HTTP webhooks | Switch to **https://** |
| Auto AI popups | Set `faultline.errorExplanation.autoShow` to `true` if you still want them |
| Factory Reset | Re-add AI / Jira keys after reset |
| Sound test in Settings | Only built-in pack **file names**, not full paths |
| Cooldown | Default `cooldownMs` is **2000**; set `0` for no cooldown |

---

## [3.1.0]

### Added

- Full interactive AI chat in Error Explanation  
- Context-aware debugging with terminal command + output  
- Enhanced webview UI (chat bubbles, typing indicators)  

---

## Links

- [README](./README.md) — product guide  
- [SECURITY](./SECURITY.md) — privacy & threat model  
- [ARCHITECTURE](./ARCHITECTURE.md) — how it works  
- [CONTRIBUTING](./CONTRIBUTING.md) — how to help  
- [Media](./docs/media/README.md) — 3 honest motion GIFs (logo / terminal / flow)

---

<p align="center">
  <sub>FaultLine · maintained by Anurag Mishra · MIT</sub>
</p>
