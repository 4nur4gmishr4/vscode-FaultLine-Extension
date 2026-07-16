# Changelog

<p align="center">
  <a href="https://github.com/4nur4gmishr4/vscode-FaultLine-Extension/actions"><img src="https://img.shields.io/github/actions/workflow/status/4nur4gmishr4/vscode-FaultLine-Extension/ci.yml?branch=main&style=flat-square" alt="CI" /></a>
  <a href="https://github.com/4nur4gmishr4/vscode-FaultLine-Extension/releases"><img src="https://img.shields.io/github/v/release/4nur4gmishr4/vscode-FaultLine-Extension?style=flat-square" alt="Release" /></a>
</p>

Notable changes to **FaultLine**. Newest first.  
Plain language first, technical detail second.

---

## [3.5.0] Production release

**Focus:** debugger and fault explainer first; error notifier second.

**Marketplace identity (do not change):** users install **FaultLine** (`displayName`).  
Extension id stays **`4nur4gmishr4.fahh`** so downloads and updates keep working. The package `name` is `fahh` on purpose.

Release: [v3.5.0](https://github.com/4nur4gmishr4/vscode-FaultLine-Extension/releases/tag/v3.5.0) (tag `v3.5.0`)

### For everyone

- Stronger capture of terminal and task failures  
- **Analyze Last Failure** keeps command and output for explanation  
- Auto-open analysis stays **off** unless you enable it  
- Optional sounds, status bar, snooze (notifier features, secondary)  
- **Factory Reset** clears settings, history, and stored API keys  
- Slimmer install package  
- First install: typed greeting from Anurag Mishra, then welcome screen, with **Skip**  
- Commands and Settings stay available even if a detector or VS Code API is missing  
- Settings UI: sounds, notifications, status bar, and explanation privacy toggles  
- Activation no longer rethrows after commands register (avoids dead palette commands)  
- Explicit `onCommand` activation for reliable palette use; emergency handlers if startup fails hard  
- Commands use safe fire-and-forget registration; workspace extension host only  
- README badges no longer hit Marketplace “retired” false positives when listing is empty  

### For power users

- Webhooks: **HTTPS only**; private hosts blocked unless allowlisted  
- Ignore patterns, cooldowns, max-per-minute, quiet hours, branch filters  
- Branch filter fails closed if the git branch cannot be read  
- Jira is opt-in, rate limited, Atlassian hosts only  

### For engineers

| Area | Highlights |
|------|------------|
| Terminal | `execution.read()`, `commandLine`, end `exitCode`, WeakMap concurrency, output cap |
| Explainer | Last failure context, provider registry, redaction, payload caps |
| Security | SSRF DNS re-check, connect IP pin and SNI, SecretStorage |
| Privacy | `errorExplanation.autoShow` default false; `aiSummary.enabled` default false |
| Reliability | Commands registered before detectors; API guards; `runCommand` error boundary |
| Packaging | `resources/vendor/*`, VSIX without `node_modules` tree, CI package smoke |
| Tests | Detectors, handleFailure, command e2e, SSRF/Jira, factory reset, AI, activate smoke |
| Welcome | Typing intro on first install only; Skip; command palette skips intro |

### Upgrade notes

| If you used… | Do this |
|--------------|---------|
| HTTP webhooks | Use `https://` |
| Auto analysis popups | Set `faultline.errorExplanation.autoShow` to `true` if you still want them |
| Factory Reset | Re-enter provider and Jira keys |
| Settings sound test | Built-in pack file names only |
| Cooldown | Default `cooldownMs` is `2000`; set `0` for none |

---

## [3.1.0]

### Added

- Interactive chat in Error Explanation  
- Failure context (command and output) for analysis  
- Updated Error Analysis layout  

---

## Links

- [README](./README.md)  
- [SECURITY](./SECURITY.md)  
- [ARCHITECTURE](./ARCHITECTURE.md)  
- [CONTRIBUTING](./CONTRIBUTING.md)  
- [Media](./docs/media/README.md)  

---

<p align="center">
  <sub>FaultLine by Anurag Mishra for developers · MIT</sub>
</p>
