# Security Policy

<p align="center">
  <img src="https://img.shields.io/badge/privacy-defaults_OFF-important?style=for-the-badge" alt="Privacy defaults off" />
  <img src="https://img.shields.io/badge/webhooks-HTTPS_only-blue?style=for-the-badge" alt="HTTPS" />
  <img src="https://img.shields.io/badge/secrets-SecretStorage-success?style=for-the-badge" alt="SecretStorage" />
</p>

> Animations that show product demos live on the [README](./README.md) — this page stays text-first so security readers can scan fast.

FaultLine watches your **local** VS Code environment (terminals, tasks, optional diagnostics).  
That means security and privacy are not optional — they are the product.

**Built by Anurag Mishra** for developers who ship. First install shows a short typed hello, then the welcome screen (you can **Skip**).

If you only need a short summary, read **For everyone**.  
If you review or harden extensions, scroll to **For engineers**.

---

# For everyone

## What FaultLine can see

- Terminal commands and their output (when shell integration is available)  
- Task names and exit codes  
- Optionally, language diagnostic errors in open files  

It does **not** need your cloud password to install.  
If you connect AI or Jira, **you** provide those credentials.

## Safe defaults (you are in control)

| Feature | Default | Why |
|---------|---------|-----|
| Auto-open AI on every failure | **Off** | Avoids surprise data leaving your machine |
| AI log summaries | **Off** | Same reason |
| Jira ticket create | **Off** | No tickets until you opt in |
| Webhooks | Empty | Nothing is sent until you set an **https** URL |

You can still analyze a failure anytime with:

**FaultLine: Analyze Last Failure**

## Where API keys live

- Stored with VS Code **SecretStorage** (encrypted by the editor / OS).  
- **Not** written as plain text in `settings.json` for normal AI keys.  
- **Factory Reset** deletes those keys on purpose — you will need to re-enter them.

## What we redact before AI

Before text goes to an AI provider, FaultLine tries to hide common secrets, for example:

- Vendor API keys (OpenAI, Anthropic, OpenRouter, Groq, Google, Hugging Face, AWS-style IDs)  
- GitHub tokens (`ghp_`, `gho_`, …)  
- JWTs, PEM private keys, Azure-style keys  
- Emails and passwords in `key=value` form  
- Credentials embedded in URLs  

**Honest limit:** Redaction is smart, not perfect.  
If your logs contain exotic secrets, turn AI off or avoid printing those secrets.

## Webhooks & Jira in plain words

- Webhooks must start with **`https://`**. HTTP is rejected.  
- Home / private network addresses are blocked unless you explicitly allow that host.  
- Jira only talks to **Atlassian** hosts (`*.atlassian.net`, `*.jira.com`) and only if you enable it.

## How to report a problem

If you find a security issue:

1. **Do not** open a public GitHub issue with exploit details.  
2. Contact the maintainer **Anurag Mishra** ([4nur4gmishr4](https://github.com/4nur4gmishr4)) privately, or use GitHub Security Advisories on the repository.  

We take reports seriously.

---

# For engineers

## Threat model (high level)

| Asset | Risk | Mitigation |
|-------|------|------------|
| Terminal output | Secret leakage to AI | PII sanitize + opt-in auto AI + size caps |
| API keys | Theft via settings / disk | SecretStorage; factory reset wipes |
| Webhook URL | SSRF to cloud metadata / LAN | HTTPS, private host block, DNS re-check, **IP pin + SNI** |
| Jira URL | Credential phishing | Domain allowlist + HTTPS + origin-only request URL |
| Settings webview | Config injection | Allowlisted keys + key format validation |
| Error Analysis webview | Oversized / malicious messages | Schema + length caps |
| Pack sound test | Path traversal | Basename-only under `resources/packs` |

## Controls in code

| Area | Location / behavior |
|------|---------------------|
| PII | `src/infrastructure/security/pii.ts` — applied in runtime + AI egress |
| Webhook gate | `evaluateWebhookUrl` / `evaluateWebhookUrlResolved` — HTTPS, allowlist, DNS, `connectHost` pin |
| Jira gate | `evaluateJiraUrl` — HTTPS + Atlassian host; POST to `{origin}/rest/api/3/issue` |
| Secrets | `src/shared/config/secretManager.ts` |
| Settings trust | `ALLOWED_SETTINGS_KEYS` in settings panel |
| AI payload caps | Error Analysis + `VALIDATION.AI_PAYLOAD` |

### Webhook connect pin

After DNS resolves to **public** addresses only:

1. Connect TCP to the **resolved IP** (`connectHost`)  
2. Present original hostname as TLS **SNI** (`servername`)  
3. Re-run the full check on **every retry**  

This reduces DNS rebinding between “check” and “connect”.

### CI security jobs

| Workflow | What it does |
|----------|----------------|
| `ci.yml` | Lint, tests + coverage, compile, VSIX content smoke (no `src` / `coverage` / `node_modules` in package) |
| `security.yml` | CodeQL + **pinned** TruffleHog |
| `dependency-review.yml` | PR dependency review |
| `release.yml` | Tag `v*` → quality gates → attach `faultline.vsix` |

## Supported versions

Security fixes target the **current Marketplace / GitHub Release** line (**3.5.0+**).  
Please upgrade to the latest release when reporting issues.

## Safe testing tips

- Use throwaway API keys in dev.  
- Prefer Copilot or local mocks for CI.  
- Never commit `.env`, tokens, or real customer logs.  
- `*.vsix`, `out/`, `coverage/` are gitignored — keep them that way.

---

<p align="center">
  <sub>FaultLine · Anurag Mishra · MIT</sub>
</p>
