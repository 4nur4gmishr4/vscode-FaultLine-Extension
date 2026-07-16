# FaultLine docs media

Exactly **three** GIFs. No duplicates. No stock art. No fake product screenshots.

| File | Built from | Used in |
|------|------------|---------|
| `logo-pulse.gif` | Real `resources/faultline-logo.png` | README header |
| `terminal-fail.gif` | Terminal failure story + logo badge | README failure demo |
| `how-it-works.gif` | Three-step flow + logo | README and ARCHITECTURE |

## Regenerate

```bash
npm run docs:gifs
# or: python scripts/make-docs-gifs.py
```

Needs Python 3 and Pillow (`pip install pillow`).

## Rules

1. One logo animation in the README header.  
2. Do not add random internet GIFs.  
3. Do not invent settings or chat panels that are not this extension.  
4. First-install typing greeting is implemented in `welcome.ts`, not as a GIF.  
5. Product framing in docs: **debugger and fault explainer first**, notifier second.  

## Logo source

`resources/faultline-logo.png`
