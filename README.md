<p align="center">
  <img src="docs/media/logo-pulse.gif" alt="FaultLine" width="180" />
</p>

<h1 align="center">FaultLine</h1>

<p align="center">
  <strong>Your AI pair when builds and terminals fail.</strong><br/>
  Instant explanations · Optional sounds · Privacy-first defaults · Built for real VS Code workflows
</p>

<p align="center">
  <a href="https://github.com/4nur4gmishr4/vscode-FaultLine-Extension/actions"><img src="https://img.shields.io/github/actions/workflow/status/4nur4gmishr4/vscode-FaultLine-Extension/ci.yml?branch=main&style=for-the-badge&label=CI" alt="CI" /></a>
  <a href="https://github.com/4nur4gmishr4/vscode-FaultLine-Extension/releases/tag/v3.5.0"><img src="https://img.shields.io/github/v/release/4nur4gmishr4/vscode-FaultLine-Extension?style=for-the-badge&label=Release" alt="Release" /></a>
  <a href="LICENSE"><img src="https://img.shields.io/github/license/4nur4gmishr4/vscode-FaultLine-Extension?style=for-the-badge" alt="License" /></a>
  <a href="https://github.com/4nur4gmishr4/vscode-FaultLine-Extension/stargazers"><img src="https://img.shields.io/github/stars/4nur4gmishr4/vscode-FaultLine-Extension?style=for-the-badge" alt="Stars" /></a>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/version-3.5.0-blue?style=flat-square" alt="3.5.0" />
  <img src="https://img.shields.io/badge/VS_Code-%5E1.93-007ACC?style=flat-square&logo=visualstudiocode&logoColor=white" alt="VS Code" />
  <img src="https://img.shields.io/badge/privacy-defaults_off-important?style=flat-square" alt="Privacy" />
  <img src="https://img.shields.io/badge/by-Anurag_Mishra-lightgrey?style=flat-square" alt="Anurag Mishra" />
</p>

---

## Why FaultLine?

You run a command. It fails. You scroll the terminal, copy the error, paste into chat, explain the context again…

**FaultLine shortens that loop.**

1. It **notices** failing terminals and tasks in VS Code  
2. It can **play a sound** so you look up without staring at the panel  
3. It can **open AI analysis** (when you ask — auto-open is off by default) with the command + output already attached  
4. Keys stay in **VS Code SecretStorage**; sensitive-looking text is **redacted** before AI calls  

**Built by Anurag Mishra** ([4nur4gmishr4](https://github.com/4nur4gmishr4)) — for every developer who ships.

### Watch a failure get caught

One motion demo — a failed build, then FaultLine’s status lines.  
Uses **your real logo** only. No fake VS Code UI. No stock “other product” art.

<p align="center">
  <img src="docs/media/terminal-fail.gif" alt="Build fails and FaultLine detects it" width="92%" />
</p>

### How it works (3 steps)

<p align="center">
  <img src="docs/media/how-it-works.gif" alt="Fail, notice, analyze" width="92%" />
</p>

---

## What you get (plain English)

| You want… | FaultLine does… |
|-----------|------------------|
| Know when something broke | Watches **terminals**, **tasks**, and optionally **diagnostics** |
| Stay in flow | Optional **failure / success sounds**, status bar, snooze |
| Understand the error | **AI chat** with last failure context |
| Stay safe by default | AI auto-open **off**, Jira **off**, webhooks **HTTPS only** |
| Use your own AI | Copilot, OpenRouter, Groq, Gemini, OpenAI, Anthropic, and more |

---

## Install in 60 seconds

### From Marketplace

1. Open VS Code  
2. Extensions → search **FaultLine**  
3. Install → reload if asked  

### From GitHub Release (VSIX)

1. Download `faultline.vsix` from [**Releases · v3.5.0**](https://github.com/4nur4gmishr4/vscode-FaultLine-Extension/releases/tag/v3.5.0)  
2. VS Code → **⋯** on Extensions → **Install from VSIX…**  

### First setup

1. `Ctrl+Shift+P` / `Cmd+Shift+P`  
2. **FaultLine: Open Configuration**  
3. Leave AI on **GitHub Copilot** (no key), **or** pick another provider and save a key  
4. Hit **Play** next to a sound to test audio  
5. Run something that fails — you should get feedback without pasting logs by hand  

> **Privacy tip:** Auto-open AI stays **off**. Use **FaultLine: Analyze Last Failure** when *you* want analysis. Turn auto-open on only if you like that.

---

## Everyday commands

| Command | What it does |
|---------|----------------|
| **FaultLine: Open Configuration** | Friendly settings UI |
| **FaultLine: Analyze Last Failure** | AI panel for the last error |
| **FaultLine: Toggle Enable / Disable** | Master on/off |
| **FaultLine: Toggle Sounds** | Sounds only |
| **FaultLine: Snooze** | Quiet for N minutes |
| **FaultLine: Show Output Log** | Debug / AI log channel |
| **FaultLine: Factory Reset** | Wipe settings, history, **and stored API keys** |
| **FaultLine: Show Welcome Screen** | Welcome / tour |

---

## Settings you’ll actually use

Open **FaultLine: Open Configuration**, or VS Code Settings and search:

`@ext:4nur4gmishr4.fahh`

| Setting | Simple meaning | Default |
|---------|----------------|---------|
| `faultline.enabled` | Master switch | on |
| `faultline.soundsEnabled` | Play sounds | on |
| `faultline.volume` | Loudness 0–100 | 100 |
| `faultline.soundPack` | Which fail sound | built-in pack |
| `faultline.successEnabled` | Sound when tasks succeed | off/on per your setup |
| `faultline.aiProvider` | Which AI | `copilot` |
| `faultline.errorExplanation.enabled` | Allow AI analysis | on |
| `faultline.errorExplanation.autoShow` | Open AI **automatically** on fail | **off** |
| `faultline.aiSummary.enabled` | Short AI line in the log | **off** |
| `faultline.cooldownMs` | Min time between sounds | 2000 |
| `faultline.ignorePatterns` | Regex — skip matching fails | empty |
| `faultline.webhookUrl` | Notify Slack/Discord/etc. | empty (**https only**) |
| `faultline.jiraEnabled` | Create Jira bugs on fail | **off** |

More options (quiet hours, sources, branch filters, allowlists) live in full VS Code Settings — use **Open all FaultLine settings** in the config panel.

---

## Privacy & safety (short version)

- **AI is opt-in for auto-open.** You choose when to analyze.  
- **API keys** go in VS Code’s **SecretStorage** (not plain `settings.json`).  
- **PII-style redaction** runs before text is sent to AI (keys, tokens, emails, etc. — best-effort).  
- **Webhooks** must be `https://`. Private/internal hosts are blocked unless you allowlist them.  
- **Jira** is off until you turn it on; only official Atlassian hosts.  
- **Factory Reset** really deletes keys — re-add them after.

Full story → [SECURITY.md](./SECURITY.md)

---

## What’s new in 3.5.0

- Rock-solid terminal capture (concurrent commands, full exit codes)  
- Production security: SSRF + DNS check + **IP pin**, PII, factory reset  
- Privacy defaults: auto AI **off**, Jira **off**  
- Slim package (~22 files in the VSIX — no huge `node_modules` blob)  
- Large automated test suite + multi-OS CI + GitHub Releases  

Details → [CHANGELOG.md](./CHANGELOG.md) · Release → [v3.5.0](https://github.com/4nur4gmishr4/vscode-FaultLine-Extension/releases/tag/v3.5.0)

---

<br/>

# For developers & contributors

*Everything below is for people who build, review, or extend FaultLine.*

---

## Architecture at a glance

```text
Terminal / Task / Diagnostics
            │
            ▼
     FaultLineRuntime.handleFailure
            │
    ┌───────┼───────────┬────────────┬────────────┐
    ▼       ▼           ▼            ▼            ▼
  Mute?   PII       Sound        History      Webhook
  Branch  sanitize  (optional)   (capped)     / Jira
  Ignore                                      (opt-in)
            │
            ▼
     AI panel / summary (only if enabled)
```

| Layer | Folder | Role |
|-------|--------|------|
| Entry | `src/extension.ts` | Activate, config reload, migrations |
| Runtime | `src/application/runtime/` | Orchestrates failures & success |
| Detectors | `src/infrastructure/detectors/` | Terminal, task, diagnostics |
| AI / HTTP | `src/infrastructure/services/` | Providers, webhooks, Jira |
| Security | `src/infrastructure/security/` | PII helpers |
| UI | `src/presentation/` | Commands, webviews, status bar |
| Shared | `src/shared/` | Config, secrets, scheduler, i18n |

Deep dive → [ARCHITECTURE.md](./ARCHITECTURE.md)

---

## Local development

```bash
git clone https://github.com/4nur4gmishr4/vscode-FaultLine-Extension.git
cd vscode-FaultLine-Extension
npm ci
npm run vendor:sync    # copy webview toolkit/codicons into resources/vendor
npm run lint
npm test -- --coverage
npm run compile
```

Press **F5** in VS Code for the Extension Development Host, or:

```bash
npm run package:prod   # produces a .vsix (gitignored)
```

| Script | Purpose |
|--------|---------|
| `vendor:sync` | Refresh `resources/vendor/*` from devDependencies |
| `lint` | Typecheck + ESLint |
| `test` | Jest unit + integration smoke |
| `test:integration` | Activate-path smoke only |
| `compile` | esbuild → `out/extension.js` |
| `package:prod` | Clean → vendor → compile → vsce package |

Contributing rules → [CONTRIBUTING.md](./CONTRIBUTING.md)

---

## Security model (engineers)

| Control | Implementation |
|---------|------------------|
| Secrets | `SecretManager` + VS Code SecretStorage |
| Webhook SSRF | HTTPS-only, private host block, DNS re-check **per attempt**, **connect IP pin + SNI** |
| Jira | `jiraEnabled` default false; HTTPS; `*.atlassian.net` / `*.jira.com`; origin-only URL |
| AI egress | Dual PII sanitize; payload size caps on Error Analysis webview |
| Settings UI | Allowlisted keys only; provider key format validation |
| Pack sounds | Basename-only under `resources/packs/{default,success}` |

Report vulnerabilities privately — see [SECURITY.md](./SECURITY.md).

---

## Tests & CI

- **Jest:** detectors, `handleFailure`, SSRF/DNS/Jira, factory reset, allowlists, AI mocks, i18n, activate smoke  
- **GitHub Actions:** Windows / Linux / macOS — lint, test+coverage, compile, Ubuntu VSIX content smoke  
- **Release:** tag `v*` → lint/test/compile → attach `faultline.vsix` to GitHub Release  
- **Security:** CodeQL + pinned TruffleHog  

---

## Project links

| | |
|--|--|
| Source | https://github.com/4nur4gmishr4/vscode-FaultLine-Extension |
| Releases | https://github.com/4nur4gmishr4/vscode-FaultLine-Extension/releases |
| Issues | https://github.com/4nur4gmishr4/vscode-FaultLine-Extension/issues |
| License | [MIT](./LICENSE) |

---

## Media

Only **three** animations live in [`docs/media/`](./docs/media/README.md) (no duplicates):

| File | Where used |
|------|------------|
| `logo-pulse.gif` | Header (real project logo) |
| `terminal-fail.gif` | “Watch a failure get caught” |
| `how-it-works.gif` | “How it works” |

Regenerate anytime: `python scripts/make-docs-gifs.py`

---

<p align="center">
  <strong>FaultLine 3.5.0</strong> · made by Anurag Mishra for developers everywhere<br/>
  <sub>MIT License</sub>
</p>
