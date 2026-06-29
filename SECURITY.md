# Security Policy

Security and data privacy are paramount in FaultLine. The extension monitors your local development environment and processes output logs, making secure design choices critical.

## Data Privacy and Logging

- **Local Execution**: All core detection mechanisms (terminal hooks, task monitors, and diagnostic scanners) operate entirely locally within your VS Code environment. 
- **Secret Management**: All sensitive configuration variables, including API keys for AI providers and webhook endpoints, are securely stored in the native VS Code `SecretStorage` system. They are never written to plaintext files or the standard `settings.json`.

## Artificial Intelligence and External Requests

When the AI Error Explanation feature is utilized, FaultLine transmits terminal output to the configured AI provider. 
- The extension employs a local redaction algorithm to sanitize Personally Identifiable Information (PII) such as email addresses, local file paths, and potential authentication tokens before transmitting data to third-party endpoints.
- Webhook functionality is protected against Server-Side Request Forgery (SSRF) by restricting outbound requests to local network IP addresses.

## Reporting a Vulnerability

If you discover a security vulnerability within FaultLine, please do not disclose it publicly on the issue tracker. Instead, reach out directly to the developer, Anurag Mishra (4nur4gmishr4), via appropriate channels or standard repository security advisories.
