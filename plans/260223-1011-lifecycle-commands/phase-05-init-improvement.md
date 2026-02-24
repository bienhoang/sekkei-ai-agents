# Phase 5: Init Improvement

## Context Links
- Parent: [plan.md](./plan.md)
- Depends on: [Phase 1 — Health Check](./phase-01-health-check-module.md)
- Target: `sekkei/packages/mcp-server/bin/init.js`

## Overview
- **Priority**: Medium
- **Status**: pending
- **Description**: After existing wizard writes `sekkei.config.yaml`, auto-install Python venv + Playwright chromium + npm build. Add `--skip-deps` flag.

## Key Insights
- Current init.js only shows a "post-setup checklist" note — user must manually run commands
- Auto-install should use `@clack/prompts` spinner for progress feedback
- Each dep install is independent — can continue if one fails (warn, don't abort)
- Python venv creation: same logic as install.sh `--with-python` section
- Playwright: `npx playwright install chromium` (downloads ~150MB)
- npm build: only if `dist/` missing (skip if already built)

## Requirements

### Functional
- After `runEditorSetup()`, auto-install:
  1. Python venv + `pip install -r requirements.txt`
  2. Playwright chromium: `npx playwright install chromium`
  3. npm build: `npm run build` (if `dist/index.js` missing)
- Show spinner per step with success/fail status
- `--skip-deps` flag skips auto-install (prints manual checklist instead, like current behavior)
- After install, run `checkHealth()` → show summary

### Non-functional
- Each step is independent — failure in one doesn't block others
- Playwright install may take 30-60s — show progress
- Total init time target: <3 min including downloads

## Architecture

Current flow:
```
wizard → sekkei.config.yaml → runEditorSetup() → print checklist → done
```

New flow:
```
wizard → sekkei.config.yaml → runEditorSetup() → [auto deps install] → health check → done
                                                  ↑ skip if --skip-deps
```

## Related Code Files
- **Modify**: `sekkei/packages/mcp-server/bin/init.js`
- **Uses**: `../dist/cli/commands/health-check.js` (Phase 1, dynamic import)
- **Reference**: `sekkei/install.sh` lines 188-217 (Python setup)
- **Reference**: `sekkei/packages/mcp-server/python/requirements.txt`

## Implementation Steps

1. Add `--skip-deps` flag parsing at top of init.js (alongside existing `--preset`)
2. After `runEditorSetup()` block, add deps install section:
3. If `--skip-deps`:
   - Print manual checklist (existing behavior)
   - Skip to outro
4. Else, auto-install:
   a. **Python venv**:
      - Detect python3/python binary
      - If found: create venv at `python/.venv/`, run `pip install -r requirements.txt`
      - If not found: warn "Python not found — export features unavailable"
   b. **Playwright**:
      - Run `npx playwright install chromium`
      - If fails: warn "Playwright install failed — PDF export unavailable"
   c. **npm build**:
      - Check if `dist/index.js` exists
      - If missing: run `npm run build`
      - If exists: skip with "Already built"
5. Resolve paths: use `import.meta.url` or `__dirname` equivalent for init.js (it's a bin script)
   - `PYTHON_DIR`: relative to init.js → `../python/`
   - `DIST_DIR`: relative to init.js → `../dist/`
   - `MCP_DIR`: relative to init.js → `../`
6. After deps install, import and run health check:
   - Dynamic import: `const { checkHealth, formatHealthReport } = await import("../dist/cli/commands/health-check.js")`
   - Print formatted report
   - If health-check module not available (dist/ just built), skip gracefully
7. Replace final checklist `p.note()` with health check output

## Todo List
- [ ] Parse --skip-deps flag
- [ ] Implement Python venv auto-creation + pip install
- [ ] Implement Playwright chromium auto-install
- [ ] Implement npm build check + auto-build
- [ ] Add spinners for each dep install step
- [ ] Show health check summary after install
- [ ] Keep --skip-deps fallback to manual checklist

## Success Criteria
- `sekkei-init` auto-installs Python + Playwright + builds in one run
- `sekkei-init --skip-deps` shows manual checklist (backward compat)
- Each dep failure is warned, not fatal
- Health check summary shown at end

## Risk Assessment
| Risk | Severity | Mitigation |
|------|----------|------------|
| Playwright download slow/fails | Medium | Timeout + warn, don't block |
| Python not installed | Medium | Detect + warn, continue without |
| npm build fails | Medium | Show error output, suggest manual fix |
| Health check import fails (circular) | Low | Dynamic import in try/catch |

## Security Considerations
- Python venv created in package dir only, not system-wide
- `execSync` commands are hardcoded, no user input interpolation
- pip install from local requirements.txt only

## Next Steps
- Phase 7 verifies full init flow end-to-end
