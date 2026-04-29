# Changelog

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
