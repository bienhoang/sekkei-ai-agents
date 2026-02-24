---
phase: 3
title: "Root README Update"
status: pending
effort: 30min
depends_on: [phase-02]
---

# Phase 3: Root README Update

## Context

- [plan.md](plan.md) | [Phase 2](phase-02-package-readmes.md)
- GitHub: https://github.com/bienhoang/sekkei-ai-agents

## Overview

Update root README.md to add npm badges, ecosystem guide with cross-package usage, update project structure, and reduce duplication (detailed content now lives in package READMEs).

## Key Insights

- Root README is currently ~200 lines with detailed tool/resource tables
- These tables now belong in mcp-server README — root should link there
- New Ecosystem section is the key addition: shows how 3 packages work together
- Project Structure section needs to include packages/skills/

## Related Code Files

### Modify
- Root `README.md`

### Reference
- `packages/mcp-server/README.md` (created in Phase 2)
- `packages/preview/README.md` (created in Phase 2)
- `packages/skills/README.md` (created in Phase 2)

## Implementation Steps

### 1. Add badges after title

```markdown
[![npm sekkei-mcp-server](https://img.shields.io/npm/v/sekkei-mcp-server)](https://www.npmjs.com/package/sekkei-mcp-server)
[![npm sekkei-preview](https://img.shields.io/npm/v/sekkei-preview)](https://www.npmjs.com/package/sekkei-preview)
[![npm sekkei-skills](https://img.shields.io/npm/v/sekkei-skills)](https://www.npmjs.com/package/sekkei-skills)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
```

### 2. Add Ecosystem section (after Quick Start)

```markdown
## Packages

| Package | Description | npm |
|---------|-------------|-----|
| [sekkei-mcp-server](./packages/mcp-server/) | Core MCP server — document generation, validation, export | [![npm](badge)](link) |
| [sekkei-preview](./packages/preview/) | VitePress live preview + WYSIWYG editor | [![npm](badge)](link) |
| [sekkei-skills](./packages/skills/) | Claude Code slash commands (`/sekkei:*`) | [![npm](badge)](link) |

### How They Work Together

\```
┌─────────────────┐     MCP (STDIO)     ┌──────────────────┐
│  sekkei-skills   │ ──────────────────→ │ sekkei-mcp-server │
│  (Claude Code)   │  /sekkei:* commands │  (Core Engine)    │
└─────────────────┘                      └────────┬─────────┘
                                                  │ generates
                                                  ↓
                                         ┌──────────────────┐
                                         │  Markdown Docs    │
                                         │  (sekkei-docs/)   │
                                         └────────┬─────────┘
                                                  │ previews
                                                  ↓
                                         ┌──────────────────┐
                                         │  sekkei-preview   │
                                         │  (VitePress)      │
                                         └──────────────────┘
\```
```

### 3. Simplify duplicate sections

Replace detailed MCP Tools, MCP Resources, Document Types tables with brief summary + link:

```markdown
## MCP Tools

8 tools for document generation, validation, export, translation, and more.
See [sekkei-mcp-server README](./packages/mcp-server/README.md#mcp-tools) for full reference.
```

Keep: Overview, Quick Start, Platform Setup (condensed), Sub-Commands table (condensed), Template Customization (brief), FAQ.

Remove/condense: Detailed MCP Tools table, MCP Resources table, full Document Types table, Environment Variables table (→ mcp-server README).

### 4. Update Project Structure

Add `packages/skills/` entry:
```
├── packages/
│   ├── mcp-server/          # sekkei-mcp-server (npm)
│   ├── preview/             # sekkei-preview (npm)
│   └── skills/              # sekkei-skills (npm) — Claude Code integration
```

Remove old `skills/` entry if present.

### 5. Add cross-package Quick Start guides

Brief sections showing common workflows:
- "Generate + Preview" workflow (mcp-server → preview)
- "Claude Code workflow" (skills → mcp-server → preview)

## Todo

- [ ] Add npm badges at top
- [ ] Add Packages/Ecosystem section with diagram
- [ ] Simplify duplicated content (link to package READMEs)
- [ ] Update Project Structure
- [ ] Add cross-package workflow guides
- [ ] Verify all internal links

## Success Criteria

- Root README under 150 lines (currently ~200)
- Ecosystem diagram renders on GitHub
- All package links resolve correctly
- No orphaned content (everything either in root or package README)

## Risk Assessment

| Risk | Impact | Mitigation |
|------|--------|------------|
| Removing too much content from root | Medium | Keep essentials (overview, quick start, FAQ), link for details |
| ASCII diagram rendering issues | Low | Use simple box-drawing chars, test on GitHub |

## Next Steps

→ Phase 4: Verification
