# Phase 3 Intelligence Layer Research: Code-Aware Generation & Staleness Detection

**Date:** 2026-02-23
**Researcher:** AI Technology Specialist
**Status:** Complete

---

## Topic 1: Code-Aware Document Generation (B3)

### AST Parsing for TypeScript/Python

**ts-morph** (TypeScript): Wraps TypeScript compiler API for safe AST navigation.
- Query: `.getClasses()`, `.getClass('MyClass')`, `.getFunctions()`
- Extract: class definitions, function signatures, parameters, types, inheritance
- Strength: Precise type info (matching V-model 詳細設計書 needs)
- Alternative: **ts-ast-parser** (simpler interface for doc generation)

**Python `ast` module**: Built-in stdlib for Python AST parsing.
- Extract: function defs, class structure, decorators, docstrings
- Lightweight, no external dependency needed

### MCP Integration Patterns

**Code Documentation Generation MCP Server** (AWS Labs):
- Uses **repomix** to extract project structure
- Generates document sections (overview, architecture, API)
- Maps code→metadata→structured output for LLM enrichment

**Code Index MCP** (johnhuang316):
- Tree-sitter AST parsing (7 language support)
- Semantic mapping: links code entities to business logic
- Search-backed retrieval for doc generation pipeline

**McpDoc Pattern**: Directory-level analysis generates:
- Extracted READMEs (code summaries)
- C4 Component diagrams (module structure)
- Rollup to C4Context/Container (system overview)

### Extraction Strategy for V-Model Docs

**For 詳細設計書 (Detailed Design):**
1. Parse source code → extract:
   - Class/function signatures → TBL-xxx (Table definitions)
   - API endpoints → API-xxx (API specs)
   - Method contracts → CLS-xxx (Class specs)
2. Cross-reference existing F-xxx, REQ-xxx from earlier phases
3. Feed structured metadata into template variables

**For テスト仕様書 (Test Spec):**
1. Extract function coverage map
2. Map to existing test assertions
3. Generate UT-xxx (Unit Test) coverage matrix

### Implementation Approach

Use **ts-morph** + **Zod schema** (already in Sekkei):
```typescript
// Extract from TypeScript source
const project = new Project({ tsConfigFilePath: 'tsconfig.json' });
const sourceFile = project.getSourceFileOrThrow('src/handlers.ts');
sourceFile.getClasses().forEach(cls => {
  const methods = cls.getMethods().map(m => ({
    name: m.getName(),
    params: m.getParameters().map(p => ({ name: p.getName(), type: p.getType().getText() })),
    returnType: m.getReturnTypeNode()?.getText()
  }));
});
```

**npm packages:** `ts-morph` (TypeScript), `python:ast` (built-in)

---

## Topic 2: Code Change → Doc Staleness Detection (C4)

### Git Diff Analysis Fundamentals

**Standard approach** (used by DocuWriter.ai):
- `git diff <base>..HEAD` → identifies file changes, line counts, impact scope
- Histogram/patience algorithms better for refactors vs. simple changes
- **Key metric:** Number of modified lines correlates with documentation impact

### Staleness Detection Strategy

**Three-level detection:**

1. **File-level:** Monitor changed files (src/, templates/, tests/)
   - Query: `git diff --name-only <base>..HEAD`
   - Flag if modified files map to feature IDs (F-xxx) in current docs

2. **Feature-level:** Map code changes to feature definitions
   - Maintain mapping: F-001 → `src/handlers/auth.ts`
   - If `auth.ts` modified → F-001 potentially stale

3. **Document-level:** Staleness scoring
   - Track last doc update date vs. code commit date
   - Age threshold: if code changed >30 days after doc → "stale"
   - Multi-file impact: if 5+ related files changed → "review required"

### CI/CD Integration Patterns

**Backstage (Spotify) model:**
- Every commit triggers TechDocs refresh check
- Comment analysis: `[no-docs-update]` to skip staleness check
- Report: files changed + affected doc sections

**ReadMe approach:**
- Commit message parsing for breaking changes
- Auto-generate migration guides when signature changes detected
- Multi-page documentation updates across affected specs

**Swimm model:**
- Document "snapshots" at specific commits
- Diff checks: code changed since snapshot → alert
- Inline code snippets automatically validated

### Implementation for Sekkei

**Git diff mapping (TypeScript):**
```typescript
// Detect changed API endpoints
import { execFile } from 'child_process';
const diff = await execFile('git', ['diff', '--name-only', 'main..HEAD']);
const changedFiles = diff.stdout.split('\n').filter(f => f.startsWith('src/'));

// Map to doc IDs via config
const featureMap = {
  'src/handlers/auth.ts': ['F-001', 'REQ-003'],
  'src/models/user.ts': ['F-002', 'TBL-005']
};

const affectedDocs = new Set<string>();
changedFiles.forEach(f => {
  if (featureMap[f]) affectedDocs.add(...featureMap[f]);
});

// Score staleness
const docAge = (Date.now() - doc.lastUpdate) / (1000 * 60 * 60 * 24); // days
const isStale = docAge > 30 && affectedDocs.has(doc.id);
```

**npm packages:**
- `simple-git` (wrapper for git commands in JS)
- `diff-lines` (detailed line-level analysis)
- `@commitlint/parse` (commit message parsing for breaking changes)

### Validation Strategy

**Before exporting (in Python bridge):**
1. Run git diff check → collect affected doc IDs
2. Load affected docs from disk
3. Cross-check: extracted code entities vs. doc claims
4. Report mismatches (e.g., API endpoint deleted but docs still reference it)
5. Block export if critical mismatches found (with override flag)

---

## Key Findings

### Code Extraction
- **ts-morph** is industry-standard for TypeScript (used by real projects)
- AST precision enables mapping code→document IDs directly
- Setup cost: ~200 lines for basic class/function extraction

### Staleness Detection
- Git diff analysis is mature, proven at scale (Spotify, ReadMe)
- Commit message parsing adds intelligence (breaking changes auto-flagged)
- 30-day age threshold + change monitoring balances accuracy/noise

### Integration Points for Sekkei
1. **analyze_update** tool: Parse git diff → return affected doc IDs
2. **generate_document** tool: Load code context via ts-morph before rendering
3. **Python bridge**: Validate extracted code matches doc claims pre-export
4. **Config extension**: Feature-to-file mapping for staleness scoring

---

## Next Steps (for Phase 3 Planning)

- [ ] Prototype ts-morph extraction on real Sekkei codebase
- [ ] Build git diff analyzer as MCP sub-tool
- [ ] Create feature-to-file mapping config schema
- [ ] Define staleness alert thresholds per org
- [ ] Test on 詳細設計書 + テスト仕様書 templates

## Unresolved Questions

1. How to handle extracted code that spans multiple files (e.g., DDD aggregates)?
2. Should staleness detection trigger auto-regeneration or just alerts?
3. Need org-specific config for what constitutes "breaking" change?
4. How to map Python/Java code to V-model IDs same way as TypeScript?

---

## Sources

- [ts-morph Documentation](https://ts-morph.com/)
- [ts-morph GitHub](https://github.com/dsherret/ts-morph)
- [Code Documentation Generation MCP Server](https://awslabs.github.io/mcp/servers/code-doc-gen-mcp-server)
- [Code Index MCP](https://github.com/johnhuang316/code-index-mcp)
- [McpDoc GitHub](https://github.com/mcpflow/McpDoc)
- [DocuWriter Git Diff Documentation](https://www.docuwriter.ai/guides/understanding-git-diff-documentation)
- [Git Diff Complete Guide](https://devtoolbox.dedyn.io/blog/git-diff-complete-guide)
- [Mintlify API Documentation Tools](https://www.mintlify.com/blog/best-api-documentation-tools-of-2025)
- [ReadMe OpenAPI Integration](https://readme.com/resources/how-to-use-openapi-and-swagger-spec-for-documentation)
- [Speakeasy Docs Vendor Comparison](https://www.speakeasy.com/blog/choosing-a-docs-vendor)
