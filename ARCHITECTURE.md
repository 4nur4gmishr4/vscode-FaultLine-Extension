# FaultLine Architecture

[![Build Status](https://img.shields.io/github/actions/workflow/status/4nur4gmishr4/vscode-fahh-Extension/ci.yml?branch=main&style=flat-square)](https://github.com/4nur4gmishr4/vscode-fahh-Extension/actions)
[![License: MIT](https://img.shields.io/github/license/4nur4gmishr4/vscode-fahh-Extension?style=flat-square)](https://opensource.org/licenses/MIT)
[![Issues](https://img.shields.io/github/issues/4nur4gmishr4/vscode-fahh-Extension?style=flat-square)](https://github.com/4nur4gmishr4/vscode-fahh-Extension/issues)
[![Stars](https://img.shields.io/github/stars/4nur4gmishr4/vscode-fahh-Extension?style=flat-square)](https://github.com/4nur4gmishr4/vscode-fahh-Extension/stargazers)

FaultLine is constructed as a modular VS Code extension designed to intercept development failures and provide immediate auditory and analytical feedback.

## Core Components

### Detectors
The extension utilizes specific detector classes to monitor the VS Code environment:
- **TerminalDetector**: Attaches to `onDidStartTerminalShellExecution` and `onDidEndTerminalShellExecution` events to stream command output buffers and intercept non-zero exit codes.
- **TaskDetector**: Monitors the VS Code Task execution API for build process failures.
- **DiagnosticDetector**: Listens to changes in the active text editor's diagnostics to track severity changes.

### Audio Player
The audio engine prioritizes low-latency execution. On Windows, it leverages a specialized VBScript wrapper interfacing directly with the `WMPlayer.OCX` COM object. This design bypasses traditional PowerShell compilation delays, enabling synchronous execution within background processes without locking the VS Code UI thread.

### AI Service
The AI Service is responsible for generating root-cause analysis based on captured failure events. It intercepts buffered terminal streams and sanitizes them before establishing connections with large language models through either native VS Code language models (Copilot) or HTTP requests to external APIs (OpenRouter, OpenAI).

### Configuration and Settings UI
Configuration properties are mapped between the native `settings.json` file and a Webview-based GUI. The Settings Panel manages bidirectional data flow, handling user input for standard preferences, advanced limits (cooldowns, maximum triggers), and secure credential storage via VS Code `SecretStorage`.

Developed by Anurag Mishra (4nur4gmishr4).
