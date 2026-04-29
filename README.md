# Fahh

> Plays a sound when things go wrong (and can celebrate when they go right).

Fahh monitors your VS Code tasks, terminal sessions, tests, builds, and more. When something fails, it plays a sound so you know immediately — even if you're looking away from the screen. With 44 features and extensive customization, Fahh is the most configurable failure notification extension for VS Code.

## What it catches (8 sources)

| Source | How | Configurable |
|---|---|---|
| Tasks | `onDidEndTaskProcess` — any task that exits non-zero | ✅ |
| Shell commands | `onDidEndTerminalShellExecution` — per command | ✅ |
| Terminal crashes | `onDidCloseTerminal` — session exits non-zero | ✅ |
| Test failures | VS Code Test API — any failed test | ✅ |
| Debug crashes | Debug session terminations | ✅ |
| Diagnostics | New lint/build errors crossing threshold | ✅ |
| Build failures | Build group tasks specifically | ✅ |
| Long tasks | Tasks exceeding duration threshold | ✅ |

## Quick Start

1. Install from Marketplace or `.vsix`
2. Run `Fahh: Play Test Sound` to verify audio
3. Let it run — Fahh works automatically

## All 14 Commands

| Command | Description |
|---|---|
| `Fahh: Play Test Sound` | Test failure sound |
| `Fahh: Play Test Success Sound` | Test success sound |
| `Fahh: Toggle Enable / Disable` | Global master switch |
| `Fahh: Toggle (This Workspace)` | Workspace-only toggle |
| `Fahh: Select Custom Sound File…` | Pick your own MP3/WAV/OGG/FLAC |
| `Fahh: Select Sound Folder (Random)` | Random sounds from folder |
| `Fahh: Reset Sound to Default` | Back to bundled Fahhh.mp3 |
| `Fahh: Pick Sound Pack` | Choose from bundled packs |
| `Fahh: Stop Currently Playing Sound` | Kill audio immediately |
| `Fahh: Snooze for Configured Minutes` | Temporary silence |
| `Fahh: Clear Failure History` | Wipe history |
| `Fahh: Replay Last Failure Sound` | Play last sound again |
| `Fahh: Show Failure History` | Open history view |
| `Fahh: Show Output Log` | Open output channel |

## Key Settings

### Basic
| Key | Default | Description |
|---|---|---|
| `fahh.enabled` | `true` | Master switch |
| `fahh.soundPath` | `""` | Custom sound file |
| `fahh.volume` | `100` | 0-100 (Win/Linux) |
| `fahh.sources` | `["task","shell","terminal"]` | Which events to catch |

### Per-Source Sounds & Volumes
| Key | Description |
|---|---|
| `fahh.sounds.task` | Sound for task failures |
| `fahh.sounds.shell` | Sound for shell command failures |
| `fahh.sounds.terminal` | Sound for terminal exits |
| `fahh.sounds.test` | Sound for test failures |
| `fahh.sounds.debug` | Sound for debug crashes |
| `fahh.sounds.diagnostics` | Sound for lint errors |
| `fahh.sounds.build` | Sound for build failures |
| `fahh.volumes.task` | Volume (-1 = use global) |
| `fahh.volumes.shell` | Volume (-1 = use global) |
| `fahh.volumes.terminal` | Volume (-1 = use global) |

### Smart Muting
| Key | Default | Description |
|---|---|---|
| `fahh.quietHours.enabled` | `false` | Enable quiet hours |
| `fahh.quietHours.from` | `"22:00"` | Start time (24h) |
| `fahh.quietHours.to` | `"08:00"` | End time (24h) |
| `fahh.muteWhenFocused` | `false` | Mute when VS Code focused |
| `fahh.snoozeMinutes` | `10` | Snooze duration |

### Rate Limiting
| Key | Default | Description |
|---|---|---|
| `fahh.cooldownMs` | `1500` | Min gap between sounds (ms) |
| `fahh.cooldownPerSource` | `false` | Separate cooldowns per source |
| `fahh.maxPerMinute` | `10` | Hard cap per minute |

### Advanced Features
| Key | Default | Description |
|---|---|---|
| `fahh.successEnabled` | `false` | Play sound on success |
| `fahh.successSound` | `""` | Success sound file |
| `fahh.soundFolder` | `""` | Random sounds from folder |
| `fahh.volumeCurve` | `"linear"` | `linear` or `log` |
| `fahh.notificationLevel` | `"warning"` | `info`/`warning`/`error`/`none` |
| `fahh.diagnosticsThreshold` | `1` | Errors needed to trigger |
| `fahh.longTaskThresholdMs` | `60000` | Long task duration (ms) |
| `fahh.statusBarCounter` | `true` | Show failure count |
| `fahh.flashStatusBar` | `true` | Red flash on failure |
| `fahh.historyMax` | `50` | History entries to keep |
| `fahh.speakLabel` | `false` | TTS the failure label |
| `fahh.webhookUrl` | `""` | POST failures to URL |
| `fahh.aiSummary.enabled` | `false` | AI failure summaries |
| `fahh.dailySummary` | `false` | 6 PM daily report |
| `fahh.streakCounter` | `false` | Track success streaks |
| `fahh.bossFightMode` | `false` | Gamified HP system |

## Platform Notes

- **Windows** — PowerShell + WPF MediaPlayer (built-in)
- **macOS** — `afplay` (built-in)
- **Linux** — `ffplay` → `paplay` → `aplay` (ffplay requires ffmpeg)
- **WSL** — Automatically routes audio to Windows host

## Remote Development

Fahh works with Remote-SSH, Dev Containers, and WSL. Set `extensionKind` to `["ui", "workspace"]` ensures audio plays on your local machine (where the speakers are).

## Building

```bash
npm install
npm run compile
npx @vscode/vsce package
```

## License

MIT © Anurag Mishra
