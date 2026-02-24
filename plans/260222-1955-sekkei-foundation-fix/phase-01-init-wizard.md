# Phase 01: `npx sekkei init` Interactive Wizard

## Context Links

- Research: [researcher-01-node-export-and-tooling.md](./research/researcher-01-node-export-and-tooling.md) §4
- Brainstorm: [brainstorm-260222-1955-sekkei-improvements.md](../reports/brainstorm-260222-1955-sekkei-improvements.md) §Approach A
- Existing setup script: `sekkei/packages/mcp-server/bin/setup.js`
- Config schema: `sekkei/packages/mcp-server/src/types/documents.ts` (ProjectConfig, KeigoLevel, ProjectType)
- Example config: `sekkei/packages/mcp-server/sekkei.config.example.yaml`

---

## Overview

- **Priority:** P1 — first thing user runs; sets tone for entire onboarding
- **Status:** pending
- **Description:** Create `bin/init.js` providing `npx sekkei init` interactive wizard using `@clack/prompts`. Collects project metadata, writes `sekkei.config.yaml`, detects editors, warns about Playwright Chromium if needed. Calls existing `setup.js` editor-detection flow at end.

---

## Key Insights

- `@clack/prompts` is 15KB, TypeScript-native, actively maintained (Feb 2026), ideal for `npx` pattern
- Existing `bin/setup.js` handles editor detection (Claude Code/Cursor/VS Code) — reuse via import, don't duplicate
- After Phase 02+03, Python is no longer required for Excel/PDF; wizard must reflect this (warn only when Python absent, not block)
- Playwright Chromium requires `npx playwright install chromium` post-install — wizard must surface this as a post-setup step
- `SEKKEI_EXPORT_ENGINE` env var (added in Phase 02) controls node vs python; wizard should set this in generated config if user selects Node.js engine
- Three presets from Phase 04 should be selectable here; wizard writes preset name into config

---

## Requirements

### Functional
- `npx sekkei init` launches wizard without global install
- Prompts: project name, project type (enum from `PROJECT_TYPES`), tech stack (multiselect), language (ja/en/vi), keigo level, preset (enterprise/standard/agile), output directory
- Generates `sekkei.config.yaml` in current working directory
- If `sekkei.config.yaml` already exists, ask to overwrite (default: no)
- Runs editor detection + MCP config from `setup.js` as final step
- Prints post-setup instructions: `npx playwright install chromium` for PDF support
- Warns if Python not found (not blocking — Node.js engine handles Excel/PDF)
- `--preset <name>` flag: skip preset selection prompt, use provided preset

### Non-functional
- Must not require global install (`npx` compatible)
- Wizard cancellable at any prompt (Ctrl+C) with clean exit
- Output config must be valid YAML parseable by `yaml` package (already a dep)
- File under 200 lines

---

## Architecture

```
bin/init.js
  ├── import @clack/prompts           (interactive prompts)
  ├── import yaml (stringify)         (already a dep — no new dep)
  ├── import ./setup.js (editor flow) (reuse existing)
  └── writes sekkei.config.yaml       (cwd)
```

Flow:
1. `p.intro('Sekkei セットアップ')`
2. Check if `sekkei.config.yaml` exists → confirm overwrite
3. `p.group({...})` — all prompts in one grouped call
4. Generate config object from responses
5. Write YAML via `yaml.stringify()`
6. Call editor-detection flow from `setup.js`
7. Print post-setup checklist
8. `p.outro('設定完了！')`

Config object shape (mirrors `ProjectConfig` from `types/documents.ts`):
```yaml
project:
  name: <user input>
  type: <selected>
  stack: [<multiselect>]
  language: <selected>
  keigo: <selected>
  preset: <selected>           # NEW field
output:
  directory: <user input>
  engine: node                 # NEW field — SEKKEI_EXPORT_ENGINE default
chain:
  rfp: ""
  overview: { status: pending }
  functions_list: { status: pending }
  requirements: { status: pending }
  basic_design: { status: pending }
  detail_design: { status: pending }
  test_spec: { status: pending }
```

---

## Related Code Files

### Modify
- `sekkei/packages/mcp-server/package.json` — add `"sekkei-init": "bin/init.js"` to `bin`, add `@clack/prompts` to `dependencies`
- `sekkei/packages/mcp-server/bin/setup.js` — export `runEditorSetup()` function so `init.js` can import it

### Create
- `sekkei/packages/mcp-server/bin/init.js` — new init wizard (≤200 lines)

---

## Implementation Steps

1. **Add dependency:** `npm install @clack/prompts` in `sekkei/packages/mcp-server/`
2. **Add bin entry:** in `package.json`, add `"sekkei-init": "bin/init.js"` to `"bin"` object
3. **Refactor `setup.js`:** extract editor-detection + setup logic into exported `runEditorSetup()` async function; keep `main()` calling it for standalone use
4. **Create `bin/init.js`:**
   - Shebang: `#!/usr/bin/env node`
   - Import `@clack/prompts`, `yaml`, `fs`, `path`, `os`
   - Check `sekkei.config.yaml` existence → confirm overwrite
   - Define prompts group (projectName, projectType, stack multiselect, language, keigo, preset, outputDir)
   - Add `--preset` CLI flag shortcut using `process.argv`
   - Build config object from prompt responses
   - `yaml.stringify(config)` → write to `sekkei.config.yaml`
   - Call `runEditorSetup()` from `setup.js`
   - Check `playwright` availability; print `npx playwright install chromium` if needed
   - Check Python availability; print warning if missing (non-blocking)
   - `p.outro()`
5. **Test manually:** `node bin/init.js` from `mcp-server/` directory
6. **Verify:** generated `sekkei.config.yaml` parses cleanly with `yaml` package

---

## Todo List

- [ ] Add `@clack/prompts` to `package.json` dependencies
- [ ] Add `sekkei-init` to `package.json` bin
- [ ] Refactor `setup.js`: export `runEditorSetup()`
- [ ] Create `bin/init.js` with full wizard flow
- [ ] Handle `--preset` CLI flag
- [ ] Handle existing config overwrite confirmation
- [ ] Generate valid `sekkei.config.yaml`
- [ ] Post-setup Playwright Chromium instruction
- [ ] Python availability warning (non-blocking)
- [ ] Manual smoke test

---

## Success Criteria

- `node bin/init.js` completes without error
- Generated `sekkei.config.yaml` is valid YAML with all required fields
- Ctrl+C at any prompt exits cleanly (no stack trace)
- `--preset enterprise` skips preset selection prompt
- Existing `sekkei.config.yaml` not overwritten without confirmation
- Editor detection still works (Cursor/Claude Code/VS Code config created)

---

## Risk Assessment

| Risk | Impact | Mitigation |
|------|--------|------------|
| `@clack/prompts` ESM/CJS compat issue in `bin/` (plain JS) | Medium | Check package exports; use dynamic import if needed |
| `setup.js` refactor breaks standalone `npx sekkei-setup` | Medium | Keep `main()` intact; only add exports |
| Generated YAML field names diverge from `ProjectConfig` type | Low | Cross-check against `types/documents.ts` before shipping |

---

## Security Considerations

- Output path from `outputDir` prompt: validate no `..` traversal before writing
- Config written only to CWD — no arbitrary path writes

---

## Next Steps

- Phase 04 (template presets) must be complete for preset prompt options to be meaningful
- Phase 02+03 completion allows removing Python warning from wizard
- After Phase 01: update `README.md` quickstart to use `npx sekkei init`
