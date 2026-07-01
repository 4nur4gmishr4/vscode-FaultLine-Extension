# Changelog

[![Build Status](https://img.shields.io/github/actions/workflow/status/4nur4gmishr4/vscode-FaultLine-Extension/ci.yml?branch=main&style=flat-square)](https://github.com/4nur4gmishr4/vscode-FaultLine-Extension/actions)
[![License: MIT](https://img.shields.io/github/license/4nur4gmishr4/vscode-FaultLine-Extension?style=flat-square)](https://opensource.org/licenses/MIT)
[![Issues](https://img.shields.io/github/issues/4nur4gmishr4/vscode-FaultLine-Extension?style=flat-square)](https://github.com/4nur4gmishr4/vscode-FaultLine-Extension/issues)
[![Stars](https://img.shields.io/github/stars/4nur4gmishr4/vscode-FaultLine-Extension?style=flat-square)](https://github.com/4nur4gmishr4/vscode-FaultLine-Extension/stargazers)

All notable changes to the FaultLine extension will be documented in this file.

## [3.1.0]

### Added
- **Full Interactive AI Chat**: The Error Explanation window now includes a fully functional, interactive chat interface seamlessly integrated with your terminal context.
- **Context-Aware Debugging**: The AI model now receives the complete terminal command and the full terminal output log when explaining an error, ensuring highly accurate solutions.
- **Enhanced UI Components**: The Webview now features an advanced layout with chat bubbles, typing indicators, and a unified design matching the VS Code theme.

### Changed
- **Repositioned Core Identity**: FaultLine is now primarily an AI-driven debugger, explainer, and solver assistant, with background audio alerts serving as a secondary enhancement.
- **Immediate Feedback Loop**: Completely removed the internal audio cooldown and debounce systems to ensure instant auditory feedback on success and failure without delay.
- **Improved Error Copying**: The "Copy Error" button in the analysis window now correctly captures both the executed command and the entire output stack trace for easy sharing.

## [3.0.0]

### Added
- Advanced Settings user interface for configuring cooldowns, maximum alerts per minute, and window focus muting.
- Intelligent AI terminal streaming. The extension now safely buffers terminal chunks during execution to provide AI models with exact contextual error logs.
- Dedicated success sound configuration and UI testing buttons.
- Webhook configuration interface for Discord and Slack integrations.

### Changed
- Completely rewrote the Windows audio engine. Replaced the legacy PowerShell and C# dynamic compilation with a highly optimized VBScript wrapper, eliminating all playback lag.
- Cleaned up the extension bundle by removing unused gamification services, legacy history views, and unnecessary image assets.
- Refactored the AI trigger logic to ensure error explanations display correctly regardless of standard VS Code notification settings.

### Fixed
- Addressed temporary file leakage by implementing an automated garbage collection routine on extension activation to clean orphaned VBScript files.

## [2.0.0]

### Added
- Support for multiple AI providers (Copilot, OpenRouter, OpenAI, Gemini).
- VS Code SecretStorage integration for secure API key management.

## [1.0.0]

### Added
- Initial release of FaultLine.
- Basic terminal and task failure detection.
- Sound playback configuration.
