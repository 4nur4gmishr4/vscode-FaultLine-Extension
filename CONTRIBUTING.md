# Contributing to FaultLine

Thanks for helping improve FaultLine.

**FaultLine** is a **debugger and fault explainer** first, and an **error notifier** second.  
Built by **Anurag Mishra** for developers who ship.

This guide is simple first, then technical.  
**3.5.0** is the production line. Keep changes solid, tested, and clear for users.

---

# For everyone

## Ways you can help

| Way | How |
|-----|-----|
| Report a bug | [GitHub Issues](https://github.com/4nur4gmishr4/vscode-FaultLine-Extension/issues) with steps, VS Code version, and OS |
| Suggest a feature | Open an issue with why it helps, not only what to add |
| Improve docs | Clearer wording and accurate behavior |
| Improve media | Only the three project GIFs; see [docs/media/README.md](./docs/media/README.md) |
| Fix code | Fork, branch, pull request |

### First-install UX (do not break this)

On first install, `WelcomePanel` shows a **typing greeting**, then the welcome body.  
There is a **Skip** button under the type area.  
**FaultLine: Show Welcome Screen** opens the body without replaying the intro.

## Before you open a PR

1. Search existing issues and PRs  
2. Keep the change focused  
3. Describe how you tested  
4. Never commit secrets, real API keys, or personal logs  

## Conduct

Be kind. Assume good intent. No harassment.  
Security issues go private ([SECURITY.md](./SECURITY.md)), not public exploit posts.

---

# For developers

## Prerequisites

- Node.js 18+ (CI uses 20)  
- npm  
- VS Code 1.93+ for Extension Development Host  

## Setup

```bash
git clone https://github.com/4nur4gmishr4/vscode-FaultLine-Extension.git
cd vscode-FaultLine-Extension
npm ci
npm run vendor:sync
```

## Quality gates

```bash
npm run lint
npm test -- --coverage
npm run test:integration
npm run compile
```

Optional:

```bash
npm run package:prod
```

## Project map

| Path | What lives there |
|------|------------------|
| `src/application/runtime/faultline.ts` | Failure and success handling |
| `src/infrastructure/detectors/` | Terminal, task, diagnostics |
| `src/infrastructure/services/` | Explainer backends, webhooks, Jira |
| `src/infrastructure/security/pii.ts` | Redaction |
| `src/presentation/` | Commands and webviews |
| `src/shared/config/` | Settings, secrets, constants |
| `src/test/` | Jest tests |
| `resources/vendor/` | Packaged webview assets |
| `scripts/sync-vendor.js` | Vendor copy |
| `scripts/make-docs-gifs.py` | Docs GIFs |

Architecture: [ARCHITECTURE.md](./ARCHITECTURE.md)

## Coding guidelines

1. Prefer typed code; avoid `any` in production `src/`  
2. Small functions with one job  
3. Comments explain why, not what  
4. Do not log secrets or full model replies at `info`  
5. Webhooks stay HTTPS and SSRF-safe  
6. Add tests when you change detectors, SSRF, or settings trust  

## Docs to update when behavior changes

| Change type | Update |
|-------------|--------|
| User-visible feature | `README.md` and `CHANGELOG.md` |
| Security or privacy | `SECURITY.md` and `CHANGELOG.md` |
| Structure or flow | `ARCHITECTURE.md` |
| Scripts or setup | this file |

## Commit style

Clear human messages, for example:

```text
fix(terminal): wait for stream drain before reading exitCode

docs: describe fault explainer before notifier features
```

## Release process (maintainers)

1. Keep `package.json` version and `EXTENSION.VERSION` aligned  
2. Update `CHANGELOG.md`  
3. Push `main` when green  
4. Tag `vX.Y.Z` so Actions attaches `faultline.vsix`  
5. Marketplace publish is separate (`vsce publish`)  

## Media

Only three GIFs. Rules: [docs/media/README.md](./docs/media/README.md)

---

<p align="center">
  <sub>FaultLine 3.5.0 · Anurag Mishra · MIT</sub>
</p>
