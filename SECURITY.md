# Security Policy

[![Build Status](https://img.shields.io/github/actions/workflow/status/4nur4gmishr4/vscode-FaultLine-Extension/ci.yml?branch=main&style=flat-square)](https://github.com/4nur4gmishr4/vscode-FaultLine-Extension/actions)
[![License: MIT](https://img.shields.io/github/license/4nur4gmishr4/vscode-FaultLine-Extension?style=flat-square)](https://opensource.org/licenses/MIT)

Security and data privacy are paramount in FaultLine. The extension monitors the local development environment and may process terminal output, so secure defaults and egress controls matter.

## Data privacy and logging

- **Local execution**: Detection (terminal, tasks, diagnostics) runs in the VS Code host.
- **Secret management**: AI and integration API keys use VS Code **SecretStorage**. They are not written to workspace `settings.json` as plain secrets. Non-secret settings (e.g. Jira email/URL) may appear in settings.
- **Factory Reset**: Clears settings, failure history/state, and deletes known SecretStorage keys for AI providers and legacy integrations.
- **Logs**: AI model text is not written at `info` level; summaries log length at `debug` only when enabled.

## Artificial intelligence and external requests

When AI Error Explanation / summaries / chat are used, FaultLine may send failure context (command label and terminal output when available) to the selected provider (Copilot LM API or HTTPS APIs such as OpenRouter, OpenAI, etc.).

- Auto-open on failure (`faultline.errorExplanation.autoShow`) defaults to **off**.
- Automatic Jira create (`faultline.jiraEnabled`) defaults to **off**.
- AI summaries (`faultline.aiSummary.enabled`) default to **off**.

### PII redaction

Before outbound AI calls, text is passed through a local redaction pass that targets, among other patterns:

- Vendor API keys (OpenAI, Anthropic, OpenRouter, Groq, Google, Hugging Face, AWS access key IDs)
- GitHub tokens (`ghp_`, `gho_`, …)
- JWTs, PEM private keys, Azure AccountKey / SAS-style secrets
- Emails, URL embedded credentials, and common `password`/`token`/`api_key` assignments

Redaction is **heuristic** and may miss novel secret formats. Do not rely on it as the only control for highly sensitive environments; disable AI features or avoid capturing secrets in terminal output when needed.

### Webhooks and SSRF protections

- Webhook URLs must be **HTTPS** (HTTP is rejected).
- Without an allowlist, private/loopback/link-local hosts are blocked (IP literals via `net.isIP`; hostnames are never treated as IPv6 ULA by string prefix).
- Before each POST (including retries), FaultLine resolves DNS and blocks addresses that fall in private ranges. Failures fail closed.
- Successful resolutions **pin** the HTTPS connection to the resolved public IP while keeping the original hostname for TLS SNI (reduces DNS rebinding risk between check and connect).
- `faultline.webhookAllowedDomains` is an exact host allowlist; it can also opt in to private hosts for LAN webhooks.
- Jira integration is opt-in (`faultline.jiraEnabled`), **HTTPS only**, restricted to `*.atlassian.net` / `*.jira.com` hosts (request URL from `origin` only), rate-limited, and uses SecretStorage for the API token.

### Webview and settings integrity

- Configuration updates from the Settings UI are restricted to an allowlist of known keys.
- API keys are format-validated for the selected provider before storage.
- Error Analysis messages from the webview are schema-validated and size-limited before any AI request.
- Webview CSP uses nonces; assets load only from packaged `resources/` (vendored toolkit/codicons under `resources/vendor/`).

## CI security pipelines

- **CodeQL** (`security.yml`) on push/PR and weekly schedule.
- **TruffleHog** secret scan with a **pinned** action version (not `@main`).
- **Dependency review** on pull requests.
- **Release** never packages without lint + unit tests + `vendor:sync`.

## Reporting a vulnerability

If you discover a security vulnerability within FaultLine, please do not disclose it publicly on the issue tracker. Instead, reach out directly to the developer, Anurag Mishra (4nur4gmishr4), via appropriate channels or standard repository security advisories.
