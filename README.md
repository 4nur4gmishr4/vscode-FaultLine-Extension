# FaultLine

[![CI](https://github.com/4nur4gmishr4/vscode-faultline-Extension/actions/workflows/ci.yml/badge.svg)](https://github.com/4nur4gmishr4/vscode-faultline-Extension/actions/workflows/ci.yml)
[![Installs](https://img.shields.io/visual-studio-marketplace/i/4nur4gmishr4.faultline)](https://marketplace.visualstudio.com/items?itemName=4nur4gmishr4.faultline)

FaultLine is a VS Code extension that plays an audio notification when errors occur in your development workflow. By providing immediate auditory feedback, it allows you to maintain focus on your code without having to constantly monitor terminal outputs or task execution windows.

Developed by Anurag Mishra (4nur4gmishr4).

## Features

- **Terminal and Task Monitoring**: FaultLine automatically attaches to your integrated VS Code terminals and build tasks. If a process exits with a non-zero code, it triggers a notification.
- **Zero-Latency Audio**: The audio playback engine uses a highly optimized VBScript and Windows Media Player COM object implementation, ensuring instant, lag-free sound without blocking the main editor thread.
- **AI Error Explanations**: FaultLine can automatically capture the raw terminal output buffer and send it to an AI provider (GitHub Copilot, OpenRouter, OpenAI, etc.) to generate a detailed explanation of the error.
- **Success Notifications**: You can optionally configure FaultLine to play a specific sound when tasks complete successfully.
- **Custom Sound Packs**: The extension includes multiple default audio files, but you can configure it to play any local MP3 or WAV file on your system.
- **Advanced Configuration**: Customize cooldown periods, set a maximum number of alerts per minute, or enable "Mute When Focused" to only play sounds when VS Code is in the background.
- **Webhook Integrations**: Automatically forward error logs and AI summaries to external platforms like Discord or Slack via customizable webhooks.

## Installation

1. Install the extension from the VS Code Marketplace.
2. Open the Settings Panel by executing `FaultLine: Open Configuration` from the Command Palette.
3. Test your audio output using the "Play" buttons in the configuration panel.

## Configuration Options

FaultLine provides a rich graphical interface for managing settings. You can also modify your `settings.json` file directly:

- `faultline.audio.volume`: Master volume level (0-100).
- `faultline.audio.soundPack`: Select the default sound to play on failure.
- `faultline.audio.successSound`: Select the default sound to play on success.
- `faultline.detection.cooldownMs`: The minimum time in milliseconds to wait before playing another sound.
- `faultline.detection.maxPerMinute`: The maximum number of sounds to play within a 60-second window.
- `faultline.detection.muteWhenFocused`: Prevents sound playback if the VS Code window is currently active.
- `faultline.webhook.url`: The webhook endpoint URL to send failure data.

## Commands

- `FaultLine: Open Configuration` - Opens the primary settings webview.
- `FaultLine: Toggle Enable / Disable` - Quickly turn the extension on or off.
- `FaultLine: Snooze` - Temporarily disable audio notifications for a set duration.
- `FaultLine: Reset Settings` - Restore all configurations to their default values.

## License

This project is licensed under the MIT License. Developed by Anurag Mishra (4nur4gmishr4).
