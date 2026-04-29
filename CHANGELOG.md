# Changelog

## 2.1.0 — Audit, Hardening, Security & Performance

### Removed
- **`test` failure source**: relied on a non-existent VS Code API (`vscode.tests.onDidChangeTestResults`); never fired. Settings `fahh.sounds.test` / `fahh.volumes.test` deleted.
- **`debug` failure source**: registered an empty handler with no integration path on the public debug API. Settings `fahh.sounds.debug` / `fahh.volumes.debug` deleted.
- **Dead snooze listener** in `Scheduler.snooze()` (no-op disposable that leaked on every call).
- Test files no longer compile or ship into the `.vsix` (production hygiene).

### Security
- **Command Injection Hardening**: Voice synthesis (TTS) on Windows uses Base64-encoded payloads inside the PowerShell script body, preventing arbitrary command execution via failure labels.
- **Hardened Windows playback**: PowerShell audio playback script also Base64-encodes the file path, eliminating any quoting/injection bug.

### CRITICAL — Windows audio actually works now
- **Switched the Windows pipeline from WPF `MediaPlayer` to `mciSendString` (winmm.dll P/Invoke)**. The old WPF approach silently *never played a sound*: `MediaPlayer.MediaOpened` requires a Dispatcher / message pump, which a non-UI PowerShell session does not have, so the script always reached the 5-second deadline without ever firing `Play()`. Verified end-to-end via the production `out/audioPlayer.js` against the bundled `resources/fahh.mp3` — `OPEN_RC=0`, `PLAY_RC=0`, full-length playback. Volume is now mapped onto MCI's 0..1000 scale.

### Fixed
- **History view never visible**: moved into the `fahh` activity-bar container and removed the dead `when` clause on the never-set context key.
- **AI summary always crashed**: rewritten using the public `vscode.LanguageModelChatMessage.User(...)` factory instead of broken `as any` constructors.
- **Webhook ignored `http://`**: selects `http`/`https` transport based on URL protocol; rejects unsupported schemes with a clear log entry.
- **Daily summary never started after runtime toggle**: integrations now reschedule on every config change.
- **Welcome panel popped on every patch update**: now only auto-shows on first install or major-version bump (still available via `Fahh: Show Welcome Screen`).
- **Welcome assets broken on Remote-SSH/WSL/Codespaces**: switched to `vscode.Uri.joinPath(extensionUri, ...)`.
- **`task`/`build` source coupling**: builds and long-tasks now report independently when `task` is disabled.
- **Quiet-hours boundary off-by-one** at the end-of-window minute.
- **`TaskGroup.Build` reference equality**: prefer `group.id === 'build'` for robustness.
- **Unawaited `globalState.update`** calls (`extension.ts`, `history.ts`, `integrations.ts`) — now properly awaited / error-logged.
- **Activation events**: `["*"]` replaced with `["onStartupFinished"]` (deprecated wildcard).
- **Type safety**: `TreeView<unknown>` → `TreeView<vscode.TreeItem>`.
- **Audio reliability**: improved Windows MediaPlayer lifecycle in PowerShell so playback no longer hangs after install.

### Performance
- **`isWSL()` cached**: synchronous `/proc` read on every audio play replaced by a one-time memoised result.
- **`convertWSLPathToWindows` cached**: per-path memoisation avoids repeated `wslpath` shell-outs.
- **Diagnostics listener debounced** (500ms) and only re-counts URIs that actually changed — keeps large workspaces responsive.
- **Memory-leak fixes**:
    - Unmanaged `setInterval` in `Scheduler` and `IntegrationsManager` now cleared on dispose.
    - 1-hour TTL on the task-start tracking map.
- **Lighter task identity**: `${type}|${name}|${source}` replaces `JSON.stringify(taskDefinition)`.

### UX & Configuration
- **All commands grouped under `Fahh:`** in the palette (added `category` field).
- **Default cooldown reduced to 50 ms** for more responsive audio feedback.
- **Resources reorganised**: sounds/images/markdown live in `resources/`.
- **Bundled sound renamed** to `fahh.mp3` for consistency.
- **`longTask` now fires on failure too** when a failed task crosses the duration threshold.

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
