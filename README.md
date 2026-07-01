# FaultLine

[![Build Status](https://img.shields.io/github/actions/workflow/status/4nur4gmishr4/vscode-FaultLine-Extension/ci.yml?branch=main&style=flat-square)](https://github.com/4nur4gmishr4/vscode-FaultLine-Extension/actions)
[![License: MIT](https://img.shields.io/github/license/4nur4gmishr4/vscode-FaultLine-Extension?style=flat-square)](https://opensource.org/licenses/MIT)
[![Issues](https://img.shields.io/github/issues/4nur4gmishr4/vscode-FaultLine-Extension?style=flat-square)](https://github.com/4nur4gmishr4/vscode-FaultLine-Extension/issues)
[![Stars](https://img.shields.io/github/stars/4nur4gmishr4/vscode-FaultLine-Extension?style=flat-square)](https://github.com/4nur4gmishr4/vscode-FaultLine-Extension/stargazers)

FaultLine is an **AI-powered debugger, explainer, and solver assistant** for developers. It automatically intercepts failing terminal commands, build tasks, and shell errors in your workspace. When an error occurs, FaultLine provides instant AI-driven analysis, actionable solutions, and a fully interactive chat interface to resolve your coding issues seamlessly.

Secondarily, FaultLine provides **intelligent background audio notifications** for success and errors, allowing you to maintain focus on your code without having to constantly monitor terminal outputs or task execution windows.

Developed by Anurag Mishra (4nur4gmishr4).

## Features

- **Interactive AI Debugging Chat**: When an error occurs, click the "AI Analysis" button to open a sleek chat interface. FaultLine automatically sends the exact failing command and the full terminal output log to the AI. You can then chat iteratively with the AI to debug the issue without leaving VS Code.
- **Multiple AI Providers**: Native support for a wide array of AI services including GitHub Copilot (zero-configuration via VS Code LM API), OpenRouter, Groq, Google Gemini, Hugging Face, OpenAI, Anthropic, Mistral, Together AI, and Cohere.
- **Zero-Latency Audio Feedback**: FaultLine automatically attaches to your integrated VS Code terminals and build tasks. If a process exits with a non-zero code, it triggers an instant audio notification. A success notification triggers on a 0 exit code.
- **Custom Sound Packs**: The extension includes multiple default audio files (including "System Crash", "Impact Strike", and standard chimes), but you can configure it to play any local MP3 or WAV file on your system.
- **Advanced Configuration**: Customize cooldown periods, set a maximum number of alerts per minute, or enable "Mute When Focused" to only play sounds when VS Code is in the background.
- **Webhook Integrations**: Automatically forward error logs and AI summaries to external platforms like Discord or Slack via customizable webhooks.

## Installation

1. Install the extension from the VS Code Marketplace.
2. Open the Settings Panel by executing `FaultLine: Open Configuration` from the Command Palette.
3. Choose your preferred AI Provider and enter an API key (or leave it on `copilot` to use your existing GitHub Copilot subscription automatically).
4. Test your audio output using the "Play" buttons in the configuration panel.

## Commands

- `FaultLine: Open Configuration` - Opens the primary settings webview.
- `FaultLine: Analyze Last Failure` - Opens the AI chat and analysis interface for the most recent error.
- `FaultLine: Toggle Enable / Disable` - Quickly turn the extension on or off.
- `FaultLine: Show Welcome Screen` - Opens the getting started walkthrough.
- `FaultLine: Snooze` - Temporarily disable audio notifications for a set duration.

## Configuration Options

FaultLine provides a rich graphical interface for managing settings. You can also modify your `settings.json` file directly:

- `faultline.aiProvider`: Choose between 10+ AI providers for your debugger chat.
- `faultline.errorExplanation.enabled`: Enable the AI analysis and chat capabilities.
- `faultline.audio.volume`: Master volume level (0-100).
- `faultline.audio.soundPack`: Select the default sound to play on failure.
- `faultline.audio.successSound`: Select the default sound to play on success.
- `faultline.detection.muteWhenFocused`: Prevents sound playback if the VS Code window is currently active.

## License

This project is licensed under the MIT License. Developed by Anurag Mishra (4nur4gmishr4).
