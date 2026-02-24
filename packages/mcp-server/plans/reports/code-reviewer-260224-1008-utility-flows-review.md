# Code Review: Utility Flow Fixes
**Date:** 2026-02-24
**Files:** update.ts, health-check.ts, uninstall.ts, preview/cli.ts
**Score: 8.5 / 10**

---

## Scope

- 4 files changed, ~60 net lines added
- Focus: SUBCMD_DEFS completeness, circular import safety, stale stub cleanup, preview artifact cleanup
- Build: passes. Tests: 435/435 pass.

---

## Overall Assessment

Changes are correct and well-targeted. The circular import is real but safe under ESM live bindings as explained. The cleanup logic is conservative (best-effort, per-artifact try/catch). No regressions introduced.

---

## Issues

### Medium Priority

**1. Circular import — fragile under bundler/static analysis (update.ts ↔ health-check.ts)**

The circular dependency works at runtime because `EXPECTED_SUBCMD_COUNT` is only accessed inside function bodies (lazy evaluation), not at module top-level. ESM live bindings resolve this correctly.

However:
- `tsc --noEmit` may not warn, but bundlers (esbuild, rollup) can produce undefined values from circular ESM imports depending on initialization order.
- Jest with `ts-jest` sometimes trips on circular ESM modules — worth noting even though tests pass now.
- A future refactor extracting `SUBCMD_DEFS` to a separate `subcmd-defs.ts` (no imports from either file) would eliminate the cycle entirely at zero cost.

**Recommended fix (low-effort, clean):**

Extract to `/src/cli/commands/subcmd-defs.ts`:
```ts
export const SUBCMD_DEFS: [string, string, string][] = [ ... ];
export const EXPECTED_SUBCMD_COUNT = SUBCMD_DEFS.length;
```

Both `update.ts` and `health-check.ts` import from `subcmd-defs.js`. Cycle gone.

---

**2. preview/cli.ts — cleanup() only fires on normal child exit, not on process kill**

```ts
child.on('close', (code) => {
  if (command === 'dev') cleanup();   // ← only fires when child closes normally
  process.exit(code ?? 0);
});

process.on('SIGINT', () => { child.kill('SIGINT'); });
process.on('SIGTERM', () => { child.kill('SIGTERM'); });
```

When Ctrl-C is pressed: SIGINT → child.kill → child emits `close` → cleanup runs. This path works.

But if the parent process itself is killed with `kill -9` (SIGKILL) or crashes, `close` never fires and artifacts remain. This is a known limitation of Node.js signal handling (SIGKILL cannot be caught). Best-effort behavior is acceptable here, but worth documenting.

Also: cleanup() does not remove the `.vitepress/` parent directory if it was created empty by `generateVitePressConfig`. Only `config.mts` and `theme/` are removed. The `.vitepress/` directory itself stays. Whether this is intentional is unclear — the user note in uninstall.ts says "manually remove .vitepress/" suggesting this is accepted behavior.

---

### Low Priority

**3. uninstall.ts — preview note is unconditional**

```ts
process.stdout.write("\nNote: If you used /sekkei:preview, manually remove .vitepress/ ...\n");
```

This note always prints even if the user never used `preview`. Minor UX noise. Could be gated on whether `~/.vitepress/` or similar artifacts are detected, but given the manual cleanup is required regardless, this is acceptable as-is.

---

**4. update.ts — rmSync on SUBCMD_DIR removes user-created stubs**

```ts
if (existsSync(SUBCMD_DIR)) {
  rmSync(SUBCMD_DIR, { recursive: true, force: true });
}
```

If a user manually created custom stubs in `~/.claude/commands/sekkei/` (e.g., project-specific shortcuts), `update` silently deletes them. The behavior is consistent with "full regeneration" semantics, but no warning is issued before deletion.

Low risk in practice — the directory is managed by Sekkei — but worth documenting in the command description or help text.

---

## Positive Observations

- `EXPECTED_SUBCMD_COUNT = SUBCMD_DEFS.length` is the right approach — single source of truth, no magic number.
- Per-artifact try/catch in `cleanup()` is correct — one failure doesn't prevent subsequent cleanup.
- `lstatSync` (not `existsSync`) for symlink detection in cleanup is correct — works on dangling symlinks.
- All 5 new SUBCMD_DEFS entries follow the existing format exactly.
- `rmSync` with `{ recursive: true, force: true }` for directory cleanup is correct Node.js idiom.
- Stale stub cleanup before regeneration fixes the root bug cleanly without over-engineering.

---

## Recommended Actions

1. **Extract `subcmd-defs.ts`** to eliminate circular import (medium priority, ~10 min refactor)
2. **Document** the SIGKILL limitation in preview/cli.ts with a comment (low effort)
3. **Add a warning** to update command output that custom stubs will be overwritten (low effort)

---

## Unresolved Questions

- Does `generateVitePressConfig` create the `.vitepress/` parent dir? If yes, cleanup() leaves an empty dir behind. Intentional?
- Are there any downstream consumers of `EXPECTED_SUBCMD_COUNT` besides `checkSubCommands()`? If not, the circular import risk surface is small but still worth eliminating.
