# Code Review: 4-Phase Feature — workspace-docs rename + doctor + setup.sh + init defaults

**Date:** 2026-02-24
**Reviewer:** code-reviewer agent
**Build:** passes (562/562 tests)

---

## Scope

| Phase | Description | Files |
|---|---|---|
| 1 | Rename sekkei-docs → workspace-docs | `src/lib/constants.ts`, 7 TS source files, 3 test files, 6 md files, README |
| 2 | `sekkei doctor` CLI subcommand | `src/cli/commands/doctor.ts`, `src/cli/main.ts` |
| 3 | `setup.sh` one-line installer | `setup.sh` (new), `install.sh` (updated) |
| 4 | `sekkei init` output dir default | `bin/init/prompts.js` |

Scout findings: checked all TS/JS/sh/yaml files for missed `sekkei-docs` literals; checked `install.sh` vs `update.ts` subcommand list parity; checked `resolve-docs-dir.ts` priority logic.

---

## Overall Assessment

Solid, well-structured implementation. Constants pattern is correct, backward-compat is properly handled. Two medium-priority issues found (subcommand list drift, `preview/README.md` stale docs) plus minor hardcoding in `rfp-state-machine.ts` and an edge case in `setup.sh`.

---

## Critical Issues

None.

---

## High Priority

### 1. `doctor` missing from `SUBCMD_DEFS` in `update.ts` — causes drift after `sekkei update`

**File:** `packages/mcp-server/src/cli/commands/update.ts`, `install.sh`

`install.sh` creates a `doctor` stub via:
```bash
create_subcmd "doctor" "Check installation health and fix suggestions" ""
```

But `SUBCMD_DEFS` in `update.ts` (lines 39-72) does **not** contain a `["doctor", ...]` entry. After a user runs `sekkei update`, the doctor stub will be regenerated from `SUBCMD_DEFS` and will disappear. The `Commands` health check in `health-check.ts` compares against `EXPECTED_SUBCMD_COUNT = SUBCMD_DEFS.length`, which is currently 32. Install creates 22 stubs (21 declared + doctor). Both counts are mismatched with each other and with `EXPECTED_SUBCMD_COUNT`.

**Fix:** Add to `SUBCMD_DEFS` in `update.ts`:
```ts
["doctor", "Check installation health and fix suggestions", ""],
```

---

## Medium Priority

### 2. `packages/preview/README.md` still documents `./sekkei-docs` as default

**File:** `packages/preview/README.md`, lines 47, 57

The README still shows the old directory name:
```
--docs-dir <path>   Path to sekkei-docs directory (default: ./sekkei-docs)
...
Serves the `sekkei-docs/` directory as a VitePress site
```

`resolve-docs-dir.ts` now correctly resolves `workspace-docs` first. The README is the public-facing doc and will confuse new users.

**Fix:** Update to `workspace-docs` in both lines.

### 3. Hardcoded `./workspace-docs` string literal in `rfp-state-machine.ts`

**File:** `packages/mcp-server/src/lib/rfp-state-machine.ts`, line 442

The generated YAML template has:
```ts
"  directory: ./workspace-docs",
```

This is the only location in TS source that uses a bare `workspace-docs` string rather than importing `DEFAULT_WORKSPACE_DIR` from constants. If the constant is ever changed again, this will diverge.

**Fix:**
```ts
import { DEFAULT_WORKSPACE_DIR } from "./constants.js";
// ...
`  directory: ./${DEFAULT_WORKSPACE_DIR}`,
```

---

## Low Priority

### 4. `setup.sh`: `git reset --hard origin/main` on update without confirmation

**File:** `setup.sh`, lines 88-91

During the update path (when `~/.sekkei/.git` exists), if `git pull --ff-only` fails, the script silently resets to `origin/main`:
```bash
git -C "$SEKKEI_HOME" reset --hard origin/main
```

A user who has made intentional local modifications to their `~/.sekkei/` install (e.g., custom template overrides not using `SEKKEI_TEMPLATE_OVERRIDE_DIR`) will silently lose changes. The `warn` message says "Resetting to origin/main..." which is appropriate, but there is no prompt/escape hatch.

This is a low-priority UX concern rather than a security issue — the `--hard` reset is scoped to `~/.sekkei/` and doesn't touch the user's project. Acceptable for an installer, but worth documenting in comments.

### 5. `setup.sh`: Personal Access Token displayed in plain text in help message

**File:** `setup.sh`, lines 109-111

The clone failure help message shows:
```
git clone https://<TOKEN>@github.com/bienhoang/sekkei-ai-agents.git ~/.sekkei
```

This is a documentation hint, not an injection risk. The token is a user-supplied placeholder (`<TOKEN>`), not a secret in code. No action required, but ensure this is never replaced with an actual default token.

### 6. `setup.sh` PATH modification may append duplicate entries on repeated installs

**File:** `setup.sh`, lines 139-143

```bash
if [[ -n "$SHELL_RC" ]] && ! grep -q '\.local/bin' "$SHELL_RC" 2>/dev/null; then
  echo 'export PATH="$HOME/.local/bin:$PATH"' >> "$SHELL_RC"
```

The guard checks for `.local/bin` as a substring, which is correct. However, it uses a pattern match (`grep -q`), so if the user has a slightly different existing entry (e.g., `$HOME/.local/bin` not escaped), it may not match and could append a duplicate. This is acceptable for an installer script.

### 7. `setup.sh`: Doctor invoked with `|| true` — always exits 0

**File:** `setup.sh`, line 153

```bash
node "$DOCTOR_JS" doctor || true
```

The `|| true` swallows `doctor`'s exit code (which exits 1 on failures per `doctor.ts` line 68). This means a broken install will still show "Sekkei installed successfully!" even when doctor reports failures. The failures are displayed visually, so it's not invisible, but the final banner is misleading.

Consider:
```bash
node "$DOCTOR_JS" doctor || warn "Doctor reported issues — see above"
```

---

## Positive Observations

- **Constants pattern is clean.** `constants.ts` is minimal (9 lines), well-commented, and correctly imported in all 7 TS files that construct workspace paths. No hardcoded strings remain in the critical path.
- **Backward compatibility is correctly implemented.** `resolve-docs-dir.ts` checks `workspace-docs` first, then falls back to `sekkei-docs` (legacy), then `sekkei.config.yaml`. Priority ordering is correct and the error message is clear.
- **`doctor.ts` follows project conventions.** Uses `citty defineCommand`, writes via `process.stdout.write` (not `console.log`), handles `--json` flag for machine-readable output, exits with code 1 on failures. Clean 71-line file, well within 200-line guideline.
- **`main.ts` integration is minimal and correct.** One import, one entry in `subCommands`. No side effects.
- **`install.sh` doctor stub registration is done correctly** with matching description string.
- **`setup.sh` SSH-then-HTTPS fallback** is the right approach for a potentially private repo. The error message with both options (SSH key setup + PAT) is user-friendly.
- **`prompts.js` default change** correctly uses both `placeholder` and `initialValue` set to `./workspace-docs` for consistent UX.
- **TS source scan clean.** No bare `"sekkei-docs"` literals remain in `src/` except in `constants.ts` where it belongs.

---

## Recommended Actions

1. **[High]** Add `["doctor", ...]` to `SUBCMD_DEFS` in `update.ts` to prevent doctor stub from disappearing after `sekkei update`.
2. **[Medium]** Update `packages/preview/README.md` lines 47 and 57: replace `sekkei-docs` with `workspace-docs`.
3. **[Medium]** In `rfp-state-machine.ts` line 442, use `DEFAULT_WORKSPACE_DIR` constant instead of the bare string `"./workspace-docs"`.
4. **[Low]** In `setup.sh` line 153, change `|| true` to `|| warn "Doctor reported issues — see above"` so the success banner is not shown when doctor fails.

---

## Metrics

- Type coverage: N/A (tsc --noEmit clean per report)
- Test coverage: 562/562 passing
- Linting issues: 0 (per report)
- Remaining `sekkei-docs` literals in TS src: 0 (correct)
- Remaining `sekkei-docs` in preview README: 2 (stale docs)
- Subcommand parity (install.sh vs update.ts SUBCMD_DEFS): MISMATCH — `doctor` in install.sh, missing from SUBCMD_DEFS

---

## Unresolved Questions

- Does `sekkei-config.yaml`'s `output.directory` field already default to `workspace-docs` in the generated config template, or does it still produce `./sekkei-docs`? (The `rfp-state-machine.ts` line 442 suggests it generates `./workspace-docs`, which is correct — but users with old configs pointing to `sekkei-docs` will use the `resolve-docs-dir.ts` legacy fallback without any migration warning.)
- Is `EXPECTED_SUBCMD_COUNT` (32 in update.ts) intended to match install.sh's 22 stubs, or are these two intentionally different sets? If install.sh is meant to be the "minimal" set and update.ts the "full" set, this should be documented.
