# Changelog

All notable changes to the "faultline" extension will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [3.0.0] - 2026-06-03

### Added
- **Security-First Architecture**: Complete migration of all API keys to VS Code `SecretStorage`.
- **Domain-Driven Configuration**: Reorganized settings into structured nested models (`audio`, `detection`, `ai`, `ui`, `webhook`).
- **AI-Powered Root Cause Analysis**: Support for VS Code Copilot and OpenRouter providers to explain failures.
- **Integrated Setup**: Embedded selectors for AI Providers and Sound Packs in the Welcome screen.
- **Analyze Last Failure**: New command to instantly trigger AI analysis of the most recent error.
- **SSRF Protection**: Built-in private IP blocking for outbound webhooks.
- **Automated PII Redaction**: Local sanitization of emails, tokens, and paths before external transmission.
- **CSV/JSON History Export**: Capability to export local failure logs with formula injection protection.
- **Native UI**: Rewritten Welcome and Error Analysis webviews using the VS Code Webview UI Toolkit.
- **Production QA Suite**: 14 test suites verifying lifecycle, command parity, and security regressions.

### Fixed
- Fatal TypeScript compile errors and critical ESLint "Floating Promise" violations.
- RCE vulnerability in PowerShell Text-to-Speech engine via Base64 encoding.
- GraphQL injection vulnerability in project management integrations.
- Broken test fixtures caused by legacy configuration drift.

### Changed
- Refactored monolithic `extension.ts` into modular components: `runtime`, `services`, `detectors`, and `commands`.
- Simplified configuration schema by removing 42 redundant or non-functional settings.

### Removed
- Hallucinated "placeholder" modules (Sentry, PagerDuty, Jira direct, TeamSync, GitHub PRs).
- Decorative but non-accessible UI effects (Glassmorphism, Particle loops).
- Unsafe shell-based testing framework hooks.

---
MIT © Anurag Mishra
