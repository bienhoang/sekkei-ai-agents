# Phase 6: Skill Update + E2E Tests

## Context Links
- Plan: [plan.md](./plan.md)
- Phase 5: [phase-05-dual-mode.md](./phase-05-dual-mode.md)
- Skill file: `packages/skills/content/SKILL.md`
- Skill reference: `packages/skills/content/references/utilities.md`
- Current skill command: `sekkei:preview` → "Start VitePress docs preview (--edit for WYSIWYG)"

## Overview
- **Priority:** P2
- **Status:** completed
- **Effort:** 1h
- **Depends on:** Phase 5 (all implementation complete)

Update the `sekkei:preview` skill entry to reflect the new CLI flags and remove VitePress/edit-mode references. Run a structured E2E checklist covering both modes, path traversal, and CLI flags.

## Key Insights
- Skill description lives in `packages/skills/content/SKILL.md` under the `sekkei:preview` entry
- The `--edit` flag is GONE — workspace mode is always editable by default
- New flags: `--docs`, `--guide`, `--port`, `--no-open`, `--help`
- `references/utilities.md` may reference VitePress or the old plugin — check and update
- No Jest/Playwright test suite for preview — E2E is manual checklist + curl commands
- If CI runs `npm test` at repo root, preview package has no test script — add a no-op or skip

## Requirements

### Functional
- `sekkei:preview` skill description reflects new stack and flags
- No references to VitePress, `--edit`, Milkdown, or Vue in skill docs
- All E2E checklist items pass before marking phase complete

### Non-functional
- Skill update is minimal — only change what's wrong/outdated
- No new npm test framework added (YAGNI — manual E2E is sufficient)

## Files to Modify

- `packages/skills/content/SKILL.md` — update `sekkei:preview` entry
- `packages/skills/content/references/utilities.md` — remove VitePress/plugin refs if present
- `packages/preview/package.json` — add `"test": "echo 'no unit tests' && exit 0"` if repo CI requires it

## Implementation Steps

### 1. Update sekkei:preview in SKILL.md

Find the `sekkei:preview` entry (search for `sekkei:preview` or `VitePress`):

```bash
grep -n 'sekkei:preview\|VitePress\|--edit\|milkdown\|Milkdown' packages/skills/content/SKILL.md
```

Replace the description. Current (approximate):
```
- sekkei:preview: Start VitePress docs preview (--edit for WYSIWYG)
```

New:
```
- sekkei:preview: Start Express+React docs preview with WYSIWYG editor (--guide for readonly user guide)
```

Also update any expanded help text block for `sekkei:preview` if one exists. Replace flags:

| Old | New |
|-----|-----|
| `dev / build / serve` subcommands | removed |
| `--edit` | removed (workspace is always editable) |
| `--port <N>` (default 5173) | `--port <N>` (default 4983) |
| VitePress references | Express + React + Tiptap |

### 2. Check references/utilities.md

```bash
grep -n 'VitePress\|vitepress\|milkdown\|Milkdown\|file-api-plugin\|--edit' \
  packages/skills/content/references/utilities.md
```

Remove or update any stale references found. Typical replacements:
- "VitePress dev server" → "Express server"
- "WYSIWYG via Milkdown" → "WYSIWYG via Tiptap v3"
- "`--edit` flag" → removed; workspace mode is default editable

### 3. Add no-op test script to preview package.json (if needed)

If repo root `npm test` runs workspace tests and fails on missing `test` script:
```json
"scripts": {
  ...
  "test": "echo 'No unit tests for preview package' && exit 0"
}
```

### 4. E2E Checklist — Workspace Mode

Run each check manually or via curl. All must pass.

**Setup:**
```bash
mkdir -p /tmp/e2e-docs
cat > /tmp/e2e-docs/readme.md << 'EOF'
---
title: E2E Test Document
status: draft
---
# E2E Test

This is a **test** document with _italic_ and `code`.

## Section 1
Content here.
EOF

node packages/preview/dist/server.js --docs /tmp/e2e-docs --port 4983 --no-open &
SERVER_PID=$!
sleep 1
```

**Checklist:**
```bash
# 1. GET /api/system returns workspace mode
curl -s http://localhost:4983/api/system | grep '"mode":"workspace"'

# 2. GET /api/tree returns file list
curl -s http://localhost:4983/api/tree | grep '"name":"readme.md"'

# 3. GET /api/files returns body without frontmatter
CONTENT=$(curl -s 'http://localhost:4983/api/files?path=readme.md')
echo "$CONTENT" | grep '"content"'
# Must NOT contain '---' (frontmatter stripped)
echo "$CONTENT" | grep -v '\\-\\-\\-'

# 4. PUT /api/files saves and preserves frontmatter
curl -s -X PUT 'http://localhost:4983/api/files?path=readme.md' \
  -H 'Content-Type: application/json' \
  -d '{"content":"# Updated\n\nNew content."}' | grep '"saved":true'

# 5. Verify frontmatter preserved after PUT
grep 'title: E2E Test Document' /tmp/e2e-docs/readme.md

# 6. Path traversal blocked
curl -s 'http://localhost:4983/api/files?path=../../etc/passwd' | grep '"error":"Forbidden"'

# 7. Unknown API route returns 404 JSON
curl -s http://localhost:4983/api/nonexistent | grep '"error"'

# 8. SPA catch-all returns HTML (for React routing)
curl -s http://localhost:4983/some/spa/route | grep '<div id="root"'

kill $SERVER_PID
```

### 5. E2E Checklist — Guide Mode

```bash
node packages/preview/dist/server.js --guide --port 4984 --no-open &
GUIDE_PID=$!
sleep 1

# 1. GET /api/system returns guide mode
curl -s http://localhost:4984/api/system | grep '"mode":"guide"'

# 2. Tree loads guide files
curl -s http://localhost:4984/api/tree

# 3. File read works
curl -s 'http://localhost:4984/api/files?path=<first-file-from-tree>' | grep '"content"'

# 4. PUT blocked in guide mode
curl -s -X PUT 'http://localhost:4984/api/files?path=any.md' \
  -H 'Content-Type: application/json' \
  -d '{"content":"x"}' | grep '"error"'
# Must return 403

kill $GUIDE_PID
```

### 6. E2E Checklist — CLI Flags

```bash
# --help exits 0 and prints usage
node packages/preview/dist/server.js --help
echo "Exit: $?"

# --port auto-selects if busy (get-port)
node packages/preview/dist/server.js --docs /tmp/e2e-docs --port 4983 --no-open &
PID1=$!
sleep 1
# Start second instance — should use different port
node packages/preview/dist/server.js --docs /tmp/e2e-docs --port 4983 --no-open &
PID2=$!
sleep 2
kill $PID1 $PID2

# Invalid --docs path exits with error message
node packages/preview/dist/server.js --docs /nonexistent/path
echo "Exit: $?"   # Must be non-zero
```

### 7. Clean up test artifacts
```bash
rm -rf /tmp/e2e-docs
```

## Todo List
- [ ] `grep` SKILL.md for stale sekkei:preview description — update
- [ ] `grep` references/utilities.md for VitePress/Milkdown refs — update/remove
- [ ] Add `"test": "echo 'No unit tests' && exit 0"` to preview package.json if CI needs it
- [ ] Run E2E workspace checklist — all curl assertions pass
- [ ] Run E2E guide mode checklist — PUT returns 403, mode=guide confirmed
- [ ] Run CLI flag tests — --help exits 0, bad --docs exits non-zero, port auto-selects
- [ ] Mark plan.md all phases `status: completed`

## Success Criteria
- `sekkei:preview` skill description: no VitePress/Milkdown/`--edit` references
- All workspace E2E curl checks pass
- Guide mode PUT returns 403
- `--help` exits 0, prints usage
- Invalid `--docs` path exits non-zero with error message
- `npm run lint` in packages/preview exits 0
- `npm run build` in packages/preview exits 0

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| SKILL.md has multiple `sekkei:preview` references (help block + list) | Medium | Low | `grep -n` first to find all occurrences |
| E2E `--guide` test fails if `guide/` not built | Medium | Medium | Run `npm run build` (which calls build:guide) before E2E |
| CI fails on missing `test` script | Low | Low | Add no-op test script preemptively |
| Port 4983 already in use on dev machine | Low | Low | Use `--port 14983` in E2E tests |

## Security Considerations
- No new security surface — this phase is read/update only
- Skill docs do not contain credentials or paths

## Next Steps
- After all phases complete: bump package version, update CHANGELOG, tag release
- Consider adding Playwright E2E tests in a future iteration (not YAGNI now)

---

## Unresolved Questions
1. Does the repo CI (`npm test` at root) iterate all workspaces? If yes, preview needs a `test` script.
2. Should `guide/` be committed to git for published package, or only built on `npm publish`? Current plan: build in `prepublish` / `build` step, keep out of git.
3. Is `tiptap-markdown@0.8.10` the latest stable version compatible with Tiptap v3.20.0? Verify at install time.
