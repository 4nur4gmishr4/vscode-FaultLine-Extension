# Security Policy

<p align="center">
  <img src="https://img.shields.io/badge/privacy-defaults_OFF-important?style=for-the-badge" alt="Privacy defaults off" />
  <img src="https://img.shields.io/badge/webhooks-HTTPS_only-blue?style=for-the-badge" alt="HTTPS" />
  <img src="https://img.shields.io/badge/secrets-SecretStorage-success?style=for-the-badge" alt="SecretStorage" />
</p>

FaultLine is a VS Code **debugger and fault explainer** first, and an optional **error notifier** second.  
It runs locally and may read terminal or task failure output. Security is part of the product, not an add-on.

Built by **Anurag Mishra** for developers who ship.

Short version: **For everyone**.  
Reviewers and contributors: scroll to **For engineers**.

Demo animations live on the [README](./README.md). This page stays text-first.

---

# For everyone

## What FaultLine can see

- Terminal commands and output (when shell integration is available)  
- Task names and exit codes  
- Optionally, diagnostic errors in open files  

Install does not need your cloud passwords.  
If you use explanation providers or Jira, **you** supply those credentials.

## Safe defaults

| Feature | Default | Why |
|---------|---------|-----|
| Auto-open fault explainer on every fail | **Off** | No surprise outbound requests |
| Short log summaries | **Off** | Same reason |
| Jira create | **Off** | Opt-in only |
| Webhooks | Empty | Nothing sent until you set an `https` URL |

To explain a failure anytime:

**FaultLine: Analyze Last Failure**

## Where API keys live

- VS Code **SecretStorage** (handled by the editor and OS)  
- Not stored as plain secrets in normal settings for provider keys  
- **Factory Reset** deletes those keys; you must enter them again  

## What is redacted before explanation requests

Before text leaves for a configured provider, FaultLine tries to mask common secrets:

- Vendor API keys (OpenAI, Anthropic, OpenRouter, Groq, Google, Hugging Face, AWS-style IDs)  
- GitHub tokens (`ghp_`, `gho_`, and similar)  
- JWTs, PEM private keys, Azure-style keys  
- Emails and `password` / `token` style assignments  
- Credentials embedded in URLs  

Redaction is best effort. If logs contain unusual secrets, turn explanation features off or avoid printing those secrets.

## Webhooks and Jira

- Webhooks must use **`https://`**. HTTP is rejected.  
- Private or local hosts are blocked unless you allowlist the host.  
- Jira only uses **Atlassian** hosts (`*.atlassian.net`, `*.jira.com`) when enabled.  

## Report a problem

1. Do not post exploit details in a public issue.  
2. Contact **Anurag Mishra** ([4nur4gmishr4](https://github.com/4nur4gmishr4)) privately, or use GitHub Security Advisories.  

---

# For engineers

## Threat model

| Asset | Risk | Mitigation |
|-------|------|------------|
| Terminal output | Leak to explanation provider | Redaction, auto-open off, size caps |
| API keys | Theft via settings or disk | SecretStorage, factory reset wipe |
| Webhook URL | SSRF to LAN or metadata | HTTPS, private host block, DNS re-check, IP pin and SNI |
| Jira URL | Credential phishing | Domain allowlist, HTTPS, origin-only URL |
| Settings webview | Config injection | Allowlisted keys, key format checks |
| Error Analysis webview | Oversized or hostile payloads | Schema and length caps |
| Pack sound test | Path traversal | Basename only under `resources/packs` |

## Controls in code

| Area | Location / behavior |
|------|---------------------|
| Redaction | `src/infrastructure/security/pii.ts` (runtime and egress) |
| Webhook gate | `evaluateWebhookUrl` / `evaluateWebhookUrlResolved` |
| Jira gate | `evaluateJiraUrl`; POST `{origin}/rest/api/3/issue` |
| Secrets | `src/shared/config/secretManager.ts` |
| Settings trust | `ALLOWED_SETTINGS_KEYS` in settings panel |
| Explainer payload caps | Error Analysis and `VALIDATION.AI_PAYLOAD` |

### Webhook connect pin

After DNS resolves only to public addresses:

1. Connect TCP to the resolved IP (`connectHost`)  
2. Use the original hostname for TLS SNI (`servername`)  
3. Re-run the full check on every retry  

### CI security jobs

| Workflow | Role |
|----------|------|
| `ci.yml` | Lint, tests with coverage, compile, VSIX content checks |
| `security.yml` | CodeQL and pinned TruffleHog |
| `dependency-review.yml` | PR dependency review |
| `release.yml` | Tag `v*` builds and attaches `faultline.vsix` |

## Supported versions

Security fixes target the current release line (**3.5.0** and later).  
Please upgrade before reporting.

## Safe testing tips

- Use throwaway keys in development.  
- Prefer Copilot or mocks in CI.  
- Never commit tokens or real customer logs.  
- Keep `*.vsix`, `out/`, and `coverage/` out of git.  

---

<p align="center">
  <sub>FaultLine · Anurag Mishra · MIT</sub>
</p>
