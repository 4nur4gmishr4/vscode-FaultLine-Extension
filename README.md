# FaultLine! 🔊

[![CI](https://github.com/4nur4gmishr4/vscode-faultline-Extension/actions/workflows/ci.yml/badge.svg)](https://github.com/4nur4gmishr4/vscode-faultline-Extension/actions/workflows/ci.yml)
[![Installs](https://img.shields.io/visual-studio-marketplace/i/4nur4gmishr4.faultline)](https://marketplace.visualstudio.com/items?itemName=4nur4gmishr4.faultline)
[![Rating](https://img.shields.io/visual-studio-marketplace/r/4nur4gmishr4.faultline)](https://marketplace.visualstudio.com/items?itemName=4nur4gmishr4.faultline&ssr=false#review-details)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

> Plays a sound when things go wrong in your development workflow.

FaultLine v3.0 is a security-first failure notification engine for VS Code. It monitors your tasks, terminal sessions, and code diagnostics. When something fails, it plays a sound immediately—allowing you to stay in flow even when looking away from the screen.

## ✨ Key Features

-   **Multi-Source Detection**: Triggers on Task failures, Terminal exit codes, and new Diagnostic errors (red squiggly lines).
-   **AI-Powered Explanations**: Uses **VS Code Copilot** or **OpenRouter** to analyze and explain your errors instantly.
-   **Validated Webhooks**: Send failure notifications to Slack, Discord, or custom JSON endpoints with built-in SSRF protection.
-   **Secure by Design**: All API keys and tokens are stored in VS Code's encrypted **SecretStorage**.
-   **Sound Packs**: Choose from built-in sounds or point to a custom folder for randomized feedback.
-   **Quiet Hours & Snooze**: Respects your focus time with configurable quiet hours and a one-click snooze command.

## 🚀 Getting Started

1.  **Install** the extension from the VS Code Marketplace.
2.  **Open the Welcome Page** by running `FaultLine: Show Welcome Page` from the Command Palette (`Ctrl+Shift+P`).
3.  **Test the engine** using the "Play Test Sound" button.
4.  **Configure AI** (Optional) in Settings to get automated root-cause analysis.

## 🔒 Security & Privacy

-   **Secret Storage**: FaultLine v3.0 has migrated all credentials to VS Code `SecretStorage`. No API keys are stored in plaintext configuration.
-   **SSRF Protection**: Webhooks block private network IPs by default.
-   **PII Redaction**: Personally Identifiable Information (emails, tokens, file paths) is sanitized locally before being sent to AI providers or webhooks.

## 🛠️ Commands

-   `FaultLine: Play Test Sound` - Verify your audio setup.
-   `FaultLine: Toggle Enable / Disable` - Quickly turn sounds on or off.
-   `FaultLine: Snooze` - Mute sounds for a configurable duration.
-   `FaultLine: Show History` - View a history of recent failures in the sidebar.
-   `FaultLine: Clear History` - Wipe your local failure history.
-   `FaultLine: Export History (CSV/JSON)` - Export logs for analysis.

## ⚙️ Configuration

Open your VS Code Settings (`Ctrl+,`) and search for `faultline` to customize:
-   `faultline.audio.volume` - Master volume (0-100).
-   `faultline.detection.sources` - Choose which events trigger sounds.
-   `faultline.ai.provider` - Select between Copilot, OpenRouter, OpenAI, Gemini, and more.
-   `faultline.webhook.url` - Destination for failure payloads.

---

MIT © Anurag Mishra
