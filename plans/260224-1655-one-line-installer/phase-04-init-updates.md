---
title: "Phase 04 — sekkei init Updates (workspace-docs default)"
status: pending
effort: 0.5h
---

## Overview

- **Priority:** P2 (parallel-safe with Phase 2; depends on Phase 1 for constant)
- Update `sekkei init` wizard to suggest `./workspace-docs` as default output directory
- Backward compat: existing projects with `sekkei-docs/` directories are unaffected (runtime resolution already config-driven)
- Touch only the prompt defaults — no logic changes

## Requirements

- `placeholder` and `initialValue` in output dir prompt changed from `./output` → `./workspace-docs`
- The written `sekkei.config.yaml` reflects whatever the user enters (no hard override)
- i18n strings remain unchanged (label text "Output directory" stays)
- If user already has a config, overwrite flow is unchanged

## Related Code Files

**Modify:**
- `packages/mcp-server/bin/init/prompts.js` — lines 150–151 (placeholder + initialValue)

**No changes needed:**
- `packages/mcp-server/bin/init.js` — line 85 reads `docOpts.outputDir` verbatim; no default injection
- `packages/mcp-server/bin/init/i18n.js` — label text unchanged
- Config schema — `output.directory` field already exists, no schema change

## Implementation Steps

1. Open `packages/mcp-server/bin/init/prompts.js`, locate the `outputDir` prompt (~line 148):
   ```js
   const outputDir = await p.text({
     message: t(lang, "output_dir"),
     placeholder: "./output",
     initialValue: prev?.outputDir ?? "./output",
   });
   ```

2. Change to:
   ```js
   const outputDir = await p.text({
     message: t(lang, "output_dir"),
     placeholder: "./workspace-docs",
     initialValue: prev?.outputDir ?? "./workspace-docs",
   });
   ```

3. Run `sekkei init` interactively to confirm placeholder displays `./workspace-docs`.

4. Confirm generated `sekkei.config.yaml` contains `directory: ./workspace-docs` when default is accepted.

## Success Criteria

- `sekkei init` shows `./workspace-docs` as placeholder and pre-filled value for output dir prompt
- Accepting default writes `output.directory: ./workspace-docs` to `sekkei.config.yaml`
- Custom values (user overrides) still work
- No regression in existing `init` test fixtures (check `packages/mcp-server/tests/` for any init snapshots)

## Notes

- `prompts.js` is plain JS (not TS) — no build step required; change takes effect immediately
- The `./output` default was never aligned with `sekkei-docs` anyway; this corrects the inconsistency
