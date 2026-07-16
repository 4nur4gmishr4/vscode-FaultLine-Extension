# Media kit for FaultLine docs

Drop the files listed below into **this folder** (`docs/media/`).  
The main [README](../../README.md) already points at these paths — once the files exist, GitHub will show them automatically.

**Tip:** Keep GIFs under ~5–8 MB each. Prefer **dark VS Code theme**, **1080p or 720p**, **8–20 seconds**, no real secrets on screen.

| File name | What to record | Length | Used in |
|-----------|----------------|--------|---------|
| `hero.gif` or `hero.png` | Status bar + terminal fail + sound vibe (logo optional) | 10–15s | README top |
| `demo-fail-detect.gif` | Run a failing command → notification / status bar flash | 8–12s | README “What it does” |
| `demo-ai-chat.gif` | **FaultLine: Analyze Last Failure** → AI panel + one chat reply | 12–20s | README AI section |
| `demo-settings.gif` | Open Configuration → pick provider / test sound | 10–15s | README setup |
| `demo-success.gif` | Optional: task succeeds → success sound | 6–10s | README audio |
| `logo-banner.png` | Wide banner (1600×400 or similar) with logo + tagline | still | README / social |
| `marketplace-1.png` | Clean screenshot: settings panel | still | Marketplace listing |
| `marketplace-2.png` | Clean screenshot: error analysis chat | still | Marketplace listing |
| `marketplace-3.png` | Clean screenshot: status bar + terminal | still | Marketplace listing |

## Recording checklist (so nothing leaks)

- [ ] No API keys, tokens, or personal emails on screen  
- [ ] No real production URLs with credentials  
- [ ] Use a fake fail like `exit 1` or a tiny broken npm script  
- [ ] Blur or avoid private file paths if sensitive  

## Tools that work well

- **Windows:** ScreenToGif, ShareX, Clipchamp  
- **macOS:** Kap, CleanShot  
- **Cross-platform:** OBS → short clip → ezgif.com to GIF  

## After you add files

```text
docs/media/hero.gif
docs/media/demo-fail-detect.gif
docs/media/demo-ai-chat.gif
docs/media/demo-settings.gif
…etc
```

Commit them, push, and the README visuals light up.
