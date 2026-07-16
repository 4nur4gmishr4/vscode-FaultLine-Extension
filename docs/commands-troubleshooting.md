# Commands not working?

## Quick checks

1. **Reload Window** — `Developer: Reload Window` after every VSIX install  
2. Confirm id: Extensions → FaultLine → details → **`4nur4gmishr4.fahh`**  
3. Open **FaultLine: Show Output Log** — you want a line like `FaultLine commands registered`  
4. Palette search **`FaultLine`** (category), then **Toggle Enable / Disable**

## Common causes

| Symptom | Fix |
|---------|-----|
| “command not found” | Extension failed to activate — reload; reinstall `fahh-3.5.0.vsix` |
| Commands listed but silent | Check Output log for `command … failed` |
| Marketplace badge said “retired” | Cosmetics only (unpublished listing); install via GitHub VSIX |
| Dual VS Code + Cursor | Install the VSIX into the editor you actually use |

## Install from VSIX

```text
code --install-extension fahh-3.5.0.vsix --force
```

Then reload. Keep version **3.5.0** and id **`4nur4gmishr4.fahh`**.
