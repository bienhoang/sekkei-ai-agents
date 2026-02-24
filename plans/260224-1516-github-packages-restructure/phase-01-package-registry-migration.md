# Phase 1: Package Registry Migration

## Context Links
- [Brainstorm Report](../reports/brainstorm-260224-1516-github-packages-restructure.md)
- [Root package.json](../../package.json)
- [MCP Server package.json](../../packages/mcp-server/package.json)
- [Preview package.json](../../packages/preview/package.json)
- [Skills package.json](../../packages/skills/package.json)

## Overview
- **Priority**: P1 (all other phases depend on this)
- **Status**: pending
- **Effort**: 1.5h

Rename all 3 packages to `@bienhoang/*` scope, update `publishConfig.registry` to GitHub Packages, update `.npmrc`, and fix all cross-references in code, adapters, and scripts.

## Key Insights
- Current names: `sekkei-mcp-server`, `sekkei-preview`, `sekkei-skills`
- New names: `@bienhoang/sekkei-mcp-server`, `@bienhoang/sekkei-preview`, `@bienhoang/sekkei-skills`
- GitHub Packages requires package name scope to match repo owner
- `bin` command names (`sekkei-mcp`, `sekkei-setup`, `sekkei-init`, `sekkei`, `sekkei-preview`, `sekkei-skills`) remain unchanged — only the npm package name changes
- Package references exist in: 3x `package.json`, `setup.js`, `cli/commands/uninstall.ts`, `adapters/cursor/mcp.json`, `adapters/claude-code/SKILL.md`, `skills/content/references/utilities.md`, `install.sh`, `README.md`, `skills/README.md`

## Requirements

### Functional
- All 3 `package.json` files have `@bienhoang/` scope prefix
- `publishConfig.registry` points to `https://npm.pkg.github.com`
- `publishConfig.access` changed from `public` to `restricted`
- `.npmrc` maps `@bienhoang` scope to GitHub Packages registry
- All code/docs references to old package names updated

### Non-Functional
- Existing `bin` command names unchanged (no consumer-facing CLI breakage)
- `npm install` and `npm run build` still work after changes

## Related Code Files

### Files to Modify

| File | Change |
|------|--------|
| `packages/mcp-server/package.json` | name, publishConfig |
| `packages/preview/package.json` | name, publishConfig |
| `packages/skills/package.json` | name, publishConfig |
| `.npmrc` | scope-based registry |
| `packages/mcp-server/bin/setup.js` | Lines 5, 70, 193 — old name refs |
| `packages/mcp-server/src/cli/commands/uninstall.ts` | Line 80 — old name ref |
| `packages/mcp-server/adapters/cursor/mcp.json` | Line 6 — old name |
| `packages/mcp-server/adapters/claude-code/SKILL.md` | Line 887 — old name |
| `packages/skills/content/references/utilities.md` | Line 242 — old name |
| `install.sh` | No package name refs (uses paths), but verify |
| `README.md` | Multiple lines — package table, install cmds, architecture, platform setup |
| `packages/skills/README.md` | Multiple lines — npm badge, install cmd, MCP config example |
| `packages/mcp-server/README.md` | If exists, update |

### Files NOT changing
- `install.sh` — uses filesystem paths, not npm package names (verified: no `sekkei-mcp-server` string)
- `packages/mcp-server/bin/init.js` — no package name references
- `packages/mcp-server/bin/cli.js` — no package name references
- `packages/skills/bin/install.js` — no package name references
- `packages/mcp-server/adapters/copilot/copilot-instructions.md` — no package name references

## Implementation Steps

### Step 1: Update `.npmrc`

**File**: `.npmrc`

**Before**:
```
# //registry.npmjs.org/:_authToken=${NPM_TOKEN}
access=public
```

**After**:
```
@bienhoang:registry=https://npm.pkg.github.com
//npm.pkg.github.com/:_authToken=${GITHUB_TOKEN}
```

Remove `access=public` (now set per-package in `publishConfig`).

### Step 2: Update `packages/mcp-server/package.json`

Changes:
```diff
- "name": "sekkei-mcp-server",
+ "name": "@bienhoang/sekkei-mcp-server",

  "publishConfig": {
-   "access": "public"
+   "registry": "https://npm.pkg.github.com",
+   "access": "restricted"
  },
```

### Step 3: Update `packages/preview/package.json`

Changes:
```diff
- "name": "sekkei-preview",
+ "name": "@bienhoang/sekkei-preview",

  "publishConfig": {
-   "access": "public"
+   "registry": "https://npm.pkg.github.com",
+   "access": "restricted"
  },
```

### Step 4: Update `packages/skills/package.json`

Changes:
```diff
- "name": "sekkei-skills",
+ "name": "@bienhoang/sekkei-skills",

  "publishConfig": {
-   "access": "public"
+   "registry": "https://npm.pkg.github.com",
+   "access": "restricted"
  },
```

### Step 5: Update `packages/mcp-server/bin/setup.js`

Line 5 — comment:
```diff
- * Usage: npx @sekkei/setup
+ * Usage: npx @bienhoang/sekkei-mcp-server
```

Line 70 — Cursor MCP config `args`:
```diff
-         args: ["@sekkei/mcp-server"],
+         args: ["@bienhoang/sekkei-mcp-server"],
```

Line 193 — log message:
```diff
-   log("  Run 'sekkei-mcp' or 'npx sekkei-mcp-server' to start the MCP server.");
+   log("  Run 'sekkei-mcp' or 'npx @bienhoang/sekkei-mcp-server' to start the MCP server.");
```

### Step 6: Update `packages/mcp-server/src/cli/commands/uninstall.ts`

Line 80:
```diff
-     process.stdout.write("Package remains. Run `npm uninstall -g sekkei-mcp-server` to fully remove.\n");
+     process.stdout.write("Package remains. Run `npm uninstall -g @bienhoang/sekkei-mcp-server` to fully remove.\n");
```

### Step 7: Update `packages/mcp-server/adapters/cursor/mcp.json`

Line 6:
```diff
-         "sekkei-mcp-server"
+         "@bienhoang/sekkei-mcp-server"
```

### Step 8: Update `packages/mcp-server/adapters/claude-code/SKILL.md`

Line 887:
```diff
- 4. Note: "Package remains installed. Run `npm uninstall -g sekkei-mcp-server` to fully remove."
+ 4. Note: "Package remains installed. Run `npm uninstall -g @bienhoang/sekkei-mcp-server` to fully remove."
```

### Step 9: Update `packages/skills/content/references/utilities.md`

Line 242:
```diff
- 4. Note: "Package remains installed. Run `npm uninstall -g sekkei-mcp-server` to fully remove."
+ 4. Note: "Package remains installed. Run `npm uninstall -g @bienhoang/sekkei-mcp-server` to fully remove."
```

### Step 10: Regenerate `package-lock.json`

```bash
rm package-lock.json
npm install
```

This regenerates the lockfile with new scoped package names.

## Todo List

- [ ] Update `.npmrc` with GitHub Packages scope
- [ ] Update `mcp-server/package.json` — name + publishConfig
- [ ] Update `preview/package.json` — name + publishConfig
- [ ] Update `skills/package.json` — name + publishConfig
- [ ] Update `setup.js` — 3 lines with old package names
- [ ] Update `uninstall.ts` — line 80
- [ ] Update `adapters/cursor/mcp.json` — line 6
- [ ] Update `adapters/claude-code/SKILL.md` — line 887
- [ ] Update `skills/content/references/utilities.md` — line 242
- [ ] Regenerate `package-lock.json`
- [ ] Run `npm run build` — verify builds pass
- [ ] Run `npm test` — verify tests pass

## Success Criteria

- `npm ls` shows `@bienhoang/sekkei-*` names
- `npm pack --dry-run` in each package shows correct scoped name
- `npm run build && npm test` pass
- `grep -r "sekkei-mcp-server" --include="*.json" --include="*.ts" --include="*.js" --include="*.md" packages/` returns ZERO matches for unscoped names (excluding `node_modules/`, `dist/`, `coverage/`)

## Risk Assessment

| Risk | Impact | Mitigation |
|------|--------|------------|
| Missed references | Medium — broken install/setup | Full-text search verification in success criteria |
| npm workspace resolution | Low | Regenerate lockfile |
| `npx` commands break | Low — bin names unchanged | Bin names are separate from package name |

## Security Considerations
- `.npmrc` contains `${GITHUB_TOKEN}` placeholder — never commit actual token
- PAT tokens for consumers need `read:packages` scope minimum

## Next Steps
- Proceed to Phase 2 (Turborepo) after build+test pass
- README updates deferred to Phase 5
