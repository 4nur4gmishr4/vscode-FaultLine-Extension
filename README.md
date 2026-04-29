# Fahh

> Plays a sound when things go wrong.

Fahh monitors your VS Code tasks and terminal sessions. When something exits with a non-zero code, it plays `Fahhh.mp3` so you know immediately — even if you're looking away from the screen.

## What it catches

| Source | How |
|---|---|
| Tasks (build, test, custom) | `onDidEndTaskProcess` — fires when any task process exits |
| Shell commands | `onDidEndTerminalShellExecution` — fires per command in the integrated terminal |
| Terminal crashes | `onDidCloseTerminal` — fires when a terminal session closes with a non-zero exit status |

## Setup

Install from the Marketplace or from a `.vsix` file. Fahh activates on startup and runs silently until something fails. No configuration is required, but plenty is available.

## Commands

| Command | Description |
|---|---|
| `Fahh: Play Test Sound` | Plays the current sound for testing. |
| `Fahh: Toggle Enable / Disable` | Master switch (also clickable from the status bar). |
| `Fahh: Select Custom Sound File…` | Pick a custom `.mp3`/`.wav`/`.ogg`/`.flac`. |
| `Fahh: Reset Sound to Default` | Restore the bundled `Fahhh.mp3`. |
| `Fahh: Stop Currently Playing Sound` | Kill the playing audio process. |
| `Fahh: Show Output Log` | Open the Fahh output channel. |

## Settings

| Key | Default | Description |
|---|---|---|
| `fahh.enabled` | `true` | Master switch. |
| `fahh.soundPath` | `""` | Absolute path to a custom sound file. |
| `fahh.showNotification` | `true` | Show a warning toast on failure. |
| `fahh.sources` | `["task","shell","terminal"]` | Which failure sources to listen to. |
| `fahh.volume` | `100` | Playback volume 0-100 (Windows/Linux). |
| `fahh.cooldownMs` | `1500` | Minimum gap between consecutive sounds. |
| `fahh.ignorePatterns` | `[]` | Regular expressions; matched failure labels are suppressed. |
| `fahh.showStatusBar` | `true` | Show the Fahh status-bar toggle. |
| `fahh.logLevel` | `"warn"` | `off`/`error`/`warn`/`info`/`debug`. |

## Platform notes

- **Windows** — uses `System.Windows.Media.MediaPlayer` via PowerShell (built-in, no extra installs).
- **macOS** — uses `afplay`.
- **Linux** — tries `ffplay` (install via `sudo apt install ffmpeg`), then `paplay`, then `aplay`.

## Packaging & publishing

### Build the `.vsix`

```sh
npm install
npx @vscode/vsce package
```

This produces `fahh-1.0.0.vsix`. Install it locally through **Extensions → ⋯ → Install from VSIX**.

### Publish to the Marketplace

1. Create a publisher at https://marketplace.visualstudio.com/manage.
2. Update `"publisher"` in `package.json` to match your publisher ID.
3. Generate a Personal Access Token (PAT) from Azure DevOps.
4. Run:

```sh
npx @vscode/vsce login <publisher-id>
npx @vscode/vsce publish
```

## License

MIT
