# FaultLine docs media

**Exactly 3 GIFs.** No duplicates. No stock art. No fake product screenshots.

| File | Built from | Used in |
|------|------------|---------|
| `logo-pulse.gif` | Real `resources/faultline-logo.png` | README header only |
| `terminal-fail.gif` | Animated terminal story + logo badge | README “Watch a failure” |
| `how-it-works.gif` | 3-step flow + logo | README + ARCHITECTURE intro |

## Regenerate

```bash
npm run docs:gifs
# or: python scripts/make-docs-gifs.py
```

Requires: Python 3 + Pillow (`pip install pillow`).

## Rules

1. **One logo animation** in the README header — not both static PNG and pulse.  
2. **Do not** add random internet GIFs (wrong brand / looks like other tools).  
3. **Do not** add AI mock “settings/chat panels” that aren’t this app.  
4. In-product first-install **typing greeting** is **code** (`welcome.ts`), not a GIF.  
5. Optional later: real VS Code screen recordings — only if filmed from **this** extension.  

## Source of the logo

`resources/faultline-logo.png` — official project icon.
