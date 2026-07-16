# Contributing to FaultLine

Thanks for helping make FaultLine better.

**FaultLine** is built by **Anurag Mishra** for developers who ship.  
This guide is **simple first**, then **technical**.  
**3.5.0** is the production line — keep changes solid, tested, and kind to users.

---

# For everyone (including first-time contributors)

## Ways you can help

| Way | How |
|-----|-----|
| Report a bug | [GitHub Issues](https://github.com/4nur4gmishr4/vscode-FaultLine-Extension/issues) — steps + VS Code version + OS |
| Suggest a feature | Open an issue with “why” not only “what” |
| Improve docs | Typos, clearer wording, better examples |
| Improve media | Only the 3 honest GIFs — see [docs/media/README.md](./docs/media/README.md) |
| Fix code | Fork → branch → PR |

### First-install UX (don’t break this)

On first install, `WelcomePanel` shows a **typing greeting** then the welcome body.  
There is a **Skip** control under the type area.  
`FaultLine: Show Welcome Screen` opens the body **without** replaying the intro.

## Before you open a PR

1. Search existing issues / PRs  
2. Keep the change focused (one problem per PR)  
3. Describe **how you tested**  
4. Never commit secrets, real API keys, or personal logs  

## Code of conduct (short)

Be kind. Assume good intent. No harassment.  
Security issues → private report (see [SECURITY.md](./SECURITY.md)), not a public “gotcha” issue.

---

# For developers

## Prerequisites

- **Node.js 18+** (CI uses 20)  
- **npm**  
- **VS Code** 1.93+ for Extension Development Host  

## Setup

```bash
git clone https://github.com/4nur4gmishr4/vscode-FaultLine-Extension.git
cd vscode-FaultLine-Extension
npm ci
npm run vendor:sync
```

## Quality gates (same spirit as CI)

```bash
npm run lint
npm test -- --coverage
npm run test:integration
npm run compile
```

Optional package check:

```bash
npm run package:prod
# Install the .vsix in VS Code and smoke-test a failing command
```

## Project map

| Path | What lives there |
|------|------------------|
| `src/application/runtime/faultline.ts` | Failure / success orchestration |
| `src/infrastructure/detectors/` | Terminal, task, diagnostics |
| `src/infrastructure/services/` | AI + webhooks + Jira |
| `src/infrastructure/security/pii.ts` | Redaction |
| `src/presentation/` | Commands + webviews |
| `src/shared/config/` | Settings + secrets + constants |
| `src/test/` | Jest tests |
| `resources/vendor/` | Packaged webview assets |
| `scripts/sync-vendor.js` | Copies vendor assets from `node_modules` |

Architecture deep dive → [ARCHITECTURE.md](./ARCHITECTURE.md)

## Coding guidelines

1. **Type-safe** — avoid `any` in production `src/`  
2. **Small functions** — one job each  
3. **Comments explain why**, not what  
4. **Security first** — no logging secrets or full AI model text at `info`  
5. **Webhooks stay HTTPS + SSRF-safe**  
6. **Tests** for behavior you change (especially detectors, SSRF, settings trust)  

## Docs to update when you change behavior

| Change type | Update |
|-------------|--------|
| User-visible feature | `README.md` + `CHANGELOG.md` |
| Security / privacy | `SECURITY.md` + `CHANGELOG.md` |
| Structure / flow | `ARCHITECTURE.md` |
| Scripts / setup | this file |

## Commit style

Prefer clear human messages, for example:

```text
fix(terminal): wait for stream drain before reading exitCode

ship: document jira opt-in default in README
```

Release commits for maintainers may look like:

```text
ship 3.5.0 — this is the one
```

## Release process (maintainers)

1. `package.json` version + `EXTENSION.VERSION` in `constants.ts` stay aligned  
2. Update `CHANGELOG.md`  
3. Push `main` when green  
4. Tag `vX.Y.Z` → GitHub Actions builds and attaches `faultline.vsix`  
5. Marketplace publish is separate (`vsce publish` with publisher login)  

## Media contributions

GIFs and screenshots make the project feel real.  
Exact filenames and lengths → **[docs/media/README.md](./docs/media/README.md)**

---

<p align="center">
  <sub>Happy hacking · FaultLine 3.5.0 · MIT</sub>
</p>
