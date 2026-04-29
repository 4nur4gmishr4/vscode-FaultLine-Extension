# Changelog

## 2.1.0 — Security & Performance Update

### Security Fixes
- **Command Injection Hardening**: Secured voice synthesis (TTS) on Windows by using Base64 encoding for PowerShell commands, preventing arbitrary command execution via failure labels.
- **Improved Windows Playback**: Hardened PowerShell audio playback script to prevent injection via sound file paths.

### Performance & Stability
- **Diagnostics Optimization**: Debounced diagnostics listener (500ms) and optimized error counting to prevent UI lag in large workspaces.
- **Memory Leak Fixes**: 
    - Fixed unmanaged `setInterval` in `Scheduler` and `IntegrationsManager`.
    - Implemented TTL (Time-To-Live) for task tracking to prevent memory growth over time.
- **Audio Reliability**: Fixed a bug where sound playback could fail or hang after installation by improving the Windows Media Player lifecycle in PowerShell.

### UX & Configuration
- **Reduced Default Latency**: Default sound cooldown reduced to **10ms** for more responsive audio feedback.
- **Simplified Setup**: Refined configuration options for easier onboarding of non-technical users.
- **Better Type Safety**: Removed internal `any` usage for VS Code APIs, ensuring better stability.

## 2.0.0 — The Everything Update

### New Features (44 total)
- **Per-source sounds**: Different sounds for task, shell, terminal, test, debug, diagnostics, build failures
- **Sound packs**: Built-in sound packs with quick picker
- **Random sounds**: Pick random sounds from a folder
- **Success sounds**: Optional sound on successful builds/tests
- **Volume per source**: Individual volume control for each failure type
- **Volume curves**: Linear or logarithmic (perceptually natural)
- **Quiet hours**: Configurable time ranges when sounds are muted
- **Mute when focused**: Silence when VS Code window is active
- **Snooze**: Temporary mute for X minutes
- **Max per minute**: Rate limiting to prevent sound spam
- **Cooldown per source**: Independent cooldown tracking per failure type
- **Status bar counter**: Shows today's failure count
- **Status bar flashing**: Red flash while sound plays
- **Failure history**: Tree view of recent failures with replay
- **Voice synthesis**: Speaks failure labels (Win: SAPI, Mac: say, Linux: espeak)
- **Webhook notifications**: POST failures to any URL
- **AI summaries**: Uses VS Code Language Model API (Copilot) for failure explanations
- **Daily summary**: 6 PM summary of daily failures
- **Streak counter**: Tracks consecutive successes
- **Boss fight mode**: HP bar that drops on failures, defeat at 0 HP
- **New detection sources**: Tests, debug sessions, diagnostics, build-specific, long-running tasks
- **WSL detection**: Routes audio to Windows host when in WSL
- **14 commands**: Including test success, toggle workspace, snooze, history, replay
- **Walkthrough**: Onboarding guide for new users
- **Localization**: All strings externalized to package.nls.json

### Improvements
- Extension kind changed to `["ui", "workspace"]` for proper remote support
- Per-workspace toggle command
- Notification level selection (info/warning/error/none)
- Diagnostics threshold setting
- Long task threshold setting
- History max size setting
- 8 new failure detection sources
- Success detection for builds, tests, shell commands, long tasks

### Bug Fixes
- All v1.1 issues resolved
- Fixed extensionKind order for remote/SSH/Codespaces
- Fixed workspace vs global configuration targets

## 1.1.0

- Detect signal-killed processes (previously missed when `exitCode` was undefined).
- Cooldown-based dedupe to suppress duplicate notifications/sounds when the same failure fires from multiple sources.
- Configurable settings: `fahh.enabled`, `fahh.soundPath`, `fahh.showNotification`, `fahh.sources`, `fahh.volume`, `fahh.cooldownMs`, `fahh.ignorePatterns`, `fahh.showStatusBar`, `fahh.logLevel`.
- New commands: Test Sound, Toggle, Select Custom Sound, Reset Sound, Stop, Show Output.
- Status-bar toggle button.
- Output channel with configurable verbosity.
- Hardened Windows playback: passes path via PowerShell argv (no quoting bugs), waits on `MediaOpened`, bounded by 5s deadline.
- Linux fallback chain: ffplay → paplay → aplay.
- Volume control honoured on Windows and Linux.
- Custom sound files (mp3/wav/ogg/flac).
- Dedupe of overlapping events from `task` / `shell` / `terminal` sources.
- Engine bumped to `^1.93.0` (matches actual API requirements).
- Strict TS config and modular architecture (`extension`, `audioPlayer`, `failureDetector`, `config`, `logger`).

## 1.0.0

- Initial release.
- Plays `Fahhh.mp3` on task, build, and terminal failures.
- Cross-platform audio playback (Windows, macOS, Linux).
