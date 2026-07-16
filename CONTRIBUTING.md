# Contributing to FaultLine

[![Build Status](https://img.shields.io/github/actions/workflow/status/4nur4gmishr4/vscode-FaultLine-Extension/ci.yml?branch=main&style=flat-square)](https://github.com/4nur4gmishr4/vscode-FaultLine-Extension/actions)
[![License: MIT](https://img.shields.io/github/license/4nur4gmishr4/vscode-FaultLine-Extension?style=flat-square)](https://opensource.org/licenses/MIT)

Thank you for contributing to FaultLine.

## Development setup

1. Node.js 18+ and npm.
2. Clone and install:
   ```bash
   npm ci
   npm run vendor:sync
   ```
3. Quality gates (same as CI):
   ```bash
   npm run lint
   npm test -- --coverage
   npm run test:integration
   npm run compile
   ```
4. Package:
   ```bash
   npm run package:prod
   ```
5. Install the generated `.vsix` in VS Code, or press **F5** for Extension Development Host.

## Guidelines

- **Type safety**: Prefer explicit types; avoid `any` in production `src/`.
- **Security**: Never log secrets or full AI model responses at `info`. Webhooks stay HTTPS + SSRF-gated. Jira stays HTTPS + Atlassian hosts.
- **Tests**: Cover detectors, `handleFailure`, SSRF, and provider contracts when changing those paths.
- **Packaging**: Keep webview assets in `resources/vendor/` via `vendor:sync`. Do not ship `node_modules` in the VSIX. Do not use a broad `dist/` gitignore (it hides vendored assets).
- **Docs**: Update `CHANGELOG.md` for user-visible or security changes. Keep README / SECURITY / ARCHITECTURE in sync.
- **PRs**: Describe the problem, the fix, and how you verified (`lint` / `test` / manual smoke).

## Release (maintainers)

1. Keep `package.json` and `EXTENSION.VERSION` in `src/shared/config/constants.ts` aligned (production is **3.5.0**).
2. Update CHANGELOG.
3. Commit locally; push / tag only with explicit approval.
4. Tag `v3.5.0` when ready — `release.yml` runs lint/test/compile and attaches the VSIX.

## Useful paths

| Path | Role |
|------|------|
| `src/application/runtime/faultline.ts` | Failure/success orchestration |
| `src/infrastructure/services/aiProviders.ts` | AI HTTP routes |
| `src/infrastructure/services/webhookService.ts` | Webhook SSRF + Jira |
| `scripts/sync-vendor.js` | Copy webview assets into resources |

Developed by Anurag Mishra (4nur4gmishr4).
