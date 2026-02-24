# Phase 02: Preview Cleanup on Exit

## Context Links
- Parent: [plan.md](plan.md)
- Brainstorm: [brainstorm-260224-0956-utility-flows-review.md](../reports/brainstorm-260224-0956-utility-flows-review.md)

## Overview
- **Priority**: P2 (Medium)
- **Status**: complete
- **Review**: complete
- Add cleanup handler to preview CLI to remove generated artifacts on exit

## Key Insights
- Preview creates `node_modules` symlink in docs dir (line 91-95) — never cleaned
- Preview generates `.vitepress/config.mts` + `.vitepress/theme/index.ts` every run — never cleaned
- These are machine-generated files, not user content — safe to remove on exit
- Only `dev` command needs cleanup; `build`/`serve` are one-shot

## Requirements
- On dev server exit (SIGINT/SIGTERM/close), remove:
  1. `{docsDir}/node_modules` symlink (only if it's a symlink, not a real dir)
  2. `{docsDir}/.vitepress/config.mts` (generated config)
  3. `{docsDir}/.vitepress/theme/` (generated theme re-export)
- Do NOT remove `.vitepress/` dir itself — user may have custom files there
- Do NOT remove `index.md` — may have been edited by user
- Cleanup must be best-effort (no throw on failure)

## Architecture
Simple cleanup function called from signal handlers and child close event.

## Related Code Files
- **Modify**: `sekkei/packages/preview/src/cli.ts`

## Implementation Steps

### Step 1: Add cleanup function

After the `main()` function setup but before spawning child, define cleanup:

```typescript
import { existsSync, lstatSync, rmSync, unlinkSync } from 'node:fs';

function cleanup(docsDir: string, docsNodeModules: string): void {
  try {
    // Remove node_modules symlink (only if symlink, not real dir)
    if (existsSync(docsNodeModules) && lstatSync(docsNodeModules).isSymbolicLink()) {
      unlinkSync(docsNodeModules);
    }
  } catch { /* best-effort */ }

  try {
    // Remove generated VitePress config
    const configPath = join(docsDir, '.vitepress', 'config.mts');
    if (existsSync(configPath)) rmSync(configPath);
  } catch { /* best-effort */ }

  try {
    // Remove generated theme re-export dir
    const themeDir = join(docsDir, '.vitepress', 'theme');
    if (existsSync(themeDir)) rmSync(themeDir, { recursive: true, force: true });
  } catch { /* best-effort */ }
}
```

### Step 2: Wire cleanup into exit handlers

Replace current signal/close handlers with cleanup-aware versions:

```typescript
child.on('close', (code) => {
  if (command === 'dev') cleanup(docsDir, docsNodeModules);
  process.exit(code ?? 0);
});

const signals: NodeJS.Signals[] = ['SIGINT', 'SIGTERM'];
for (const sig of signals) {
  process.on(sig, () => {
    child.kill(sig);
    // cleanup happens in 'close' handler after child exits
  });
}
```

### Step 3: Build

```bash
cd sekkei/packages/preview && npm run build
```

## Todo List
- [x] Add `lstatSync`, `rmSync` to fs imports in cli.ts
- [x] Add `cleanup()` function
- [x] Wire cleanup into `child.on('close')` for dev command only
- [x] Build passes

## Success Criteria
- Dev server exit removes symlink + generated config + generated theme
- Build/serve commands don't trigger cleanup (one-shot, user may need output)
- No crash if files already removed or missing
- `npm run build` passes

## Risk Assessment
- **Low**: Cleanup is best-effort with try/catch — won't crash on failure
- **Low**: Only removes specific machine-generated files, not user content
- **Note**: If user runs `build` after `dev`, the `.vitepress/` artifacts from dev are needed. But `build` generates its own config anyway, so this is fine.

## Security Considerations
- No security impact — only removes files the CLI itself created

## Next Steps
- After both phases: commit changes, run `npx sekkei update` to sync stubs
