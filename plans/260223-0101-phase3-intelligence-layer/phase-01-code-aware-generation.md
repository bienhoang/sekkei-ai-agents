# Phase 01: Code-Aware Document Generation (B3)

## Context Links

- **Parent plan:** [plan.md](./plan.md)
- **Research:** [researcher-01-code-aware-and-staleness.md](./research/researcher-01-code-aware-and-staleness.md)
- **Brainstorm:** [brainstorm-260222-1955-sekkei-improvements.md](../../plans/reports/brainstorm-260222-1955-sekkei-improvements.md)
- **Existing generate tool:** `src/tools/generate.ts`
- **Generation instructions:** `src/lib/generation-instructions.ts`
- **ID extractor:** `src/lib/id-extractor.ts`

## Overview

- **Priority:** P1 (killer feature, highest value)
- **Status:** complete
- **Effort:** ~2 days
- **Group:** G1 (independent, can parallel with G2)

Scan actual TypeScript codebases via AST parsing to extract class signatures, function contracts, API endpoints, and type definitions. Feed extracted metadata into `generate_document` as structured context so detail-design (API-xxx, CLS-xxx, TBL-xxx) and test-spec (UT-xxx) generation is grounded in real code, not hallucinated.

## Key Insights

- **ts-morph** wraps TypeScript compiler API; ~200 lines for class/function extraction (researcher-01)
- Extracted code entities map directly to V-model IDs: classes -> CLS-xxx, API routes -> API-xxx, DB models -> TBL-xxx
- Must be optional — not all projects have TypeScript source available
- Feed extracted info as structured context block (like upstream IDs), not as replacement for LLM generation
- TypeScript first; Python/Java support deferred (YAGNI) — confirmed in Validation Session 1
<!-- Updated: Validation Session 1 - TS only confirmed, ts-morph as optional peer dep -->

## Requirements

### Functional

1. New `source_code_path` optional param on `generate_document` tool
2. New `src/lib/code-analyzer.ts` module: parse TS project, extract classes/functions/types
3. Extracted metadata formatted as structured context block injected into generation prompt
4. Support `detail-design` and `test-spec` doc types (others ignore source_code_path)
5. CLI: `sekkei generate detail-design --source-code ./src`
6. Graceful degradation: if parsing fails, warn and proceed without code context

### Non-Functional

1. Parse up to 100 source files within 10s timeout
2. No source code content leaked into output — only signatures/metadata
3. Memory: ts-morph Project disposed after extraction
4. File size: each new module under 200 lines

## Architecture

```
generate_document tool
  │
  ├── source_code_path provided?
  │     │
  │     ▼
  │   CodeAnalyzer.analyze(path)
  │     │
  │     ├── ts-morph Project(tsConfigFilePath)
  │     ├── Extract: classes, functions, interfaces, enums
  │     ├── Extract: Express/Hono route handlers → API-xxx candidates
  │     ├── Extract: TypeORM/Prisma entities → TBL-xxx candidates
  │     └── Return: CodeContext { classes, functions, apiEndpoints, dbEntities }
  │
  │   formatCodeContext(context) → markdown block
  │     │
  │     ▼
  └── Inject "## Source Code Context" section into generation prompt
        (between upstream IDs and template)
```

### Data Structures

```typescript
// src/lib/code-analyzer.ts

export interface ExtractedClass {
  name: string;
  methods: { name: string; params: string; returnType: string }[];
  properties: { name: string; type: string }[];
  extends?: string;
  implements?: string[];
}

export interface ExtractedFunction {
  name: string;
  params: string;
  returnType: string;
  exported: boolean;
  filePath: string;
}

export interface ExtractedEndpoint {
  method: string;       // GET, POST, PUT, DELETE
  path: string;         // /api/users/:id
  handlerName: string;
  filePath: string;
}

export interface ExtractedEntity {
  name: string;
  columns: { name: string; type: string; nullable: boolean }[];
  relations: { name: string; type: string; target: string }[];
}

export interface CodeContext {
  classes: ExtractedClass[];
  functions: ExtractedFunction[];
  apiEndpoints: ExtractedEndpoint[];
  dbEntities: ExtractedEntity[];
  fileCount: number;
  parseErrors: string[];
}
```

## Related Code Files

### Create

| File | Purpose | Est. Lines |
|------|---------|------------|
| `src/lib/code-analyzer.ts` | ts-morph AST extraction engine | ~180 |
| `src/lib/code-context-formatter.ts` | Format CodeContext into markdown block | ~80 |
| `tests/unit/code-analyzer.test.ts` | Unit tests for extraction | ~150 |
| `tests/unit/code-context-formatter.test.ts` | Unit tests for formatting | ~80 |
| `tests/fixtures/sample-project/` | Fixture TS files for test parsing | ~60 |

### Modify

| File | Change |
|------|--------|
| `src/tools/generate.ts` | Add `source_code_path` to inputSchema + inject code context block |
| `src/cli/commands/generate.ts` | Add `--source-code` flag |
| `src/lib/errors.ts` | Add `CODE_ANALYSIS_FAILED` error code |
| `src/types/documents.ts` | Export `CodeContext` type (or re-export from code-analyzer) |
| `package.json` | Add `ts-morph` as optional peerDependency (not bundled — dynamic import with clear error when missing) |

## Implementation Steps

### Step 1: Install ts-morph

```bash
cd sekkei/packages/mcp-server && npm install ts-morph
```

### Step 2: Add error code

In `src/lib/errors.ts`, add `"CODE_ANALYSIS_FAILED"` to `SekkeiErrorCode` union.

### Step 3: Create code-analyzer.ts

```typescript
// src/lib/code-analyzer.ts
import { Project, SyntaxKind } from "ts-morph";
import { SekkeiError } from "./errors.js";
import { logger } from "./logger.js";

const MAX_FILES = 100;
const PARSE_TIMEOUT_MS = 10_000;

export async function analyzeTypeScript(projectPath: string): Promise<CodeContext> {
  // 1. Create ts-morph Project from tsconfig.json or fallback to glob
  // 2. Limit to MAX_FILES source files
  // 3. Extract classes with getMethods(), getProperties()
  // 4. Extract exported functions with getParameters(), getReturnType()
  // 5. Detect Express/Hono route patterns via call expressions
  // 6. Detect TypeORM/Prisma entities via decorators/model patterns
  // 7. Dispose project, return CodeContext
}
```

Key extraction logic:
- **Classes:** `sourceFile.getClasses()` -> name, methods (name, params, returnType), properties
- **Functions:** `sourceFile.getFunctions().filter(f => f.isExported())` -> name, params, returnType
- **API endpoints:** Look for `app.get/post/put/delete()` or `@Get/@Post` decorator patterns
- **DB entities:** Look for `@Entity()` decorator or Prisma `model` keyword in schema files

### Step 4: Create code-context-formatter.ts

```typescript
// src/lib/code-context-formatter.ts
export function formatCodeContext(ctx: CodeContext): string {
  // Build "## Source Code Context" markdown block:
  // ### Classes (N found)
  // | Class | Methods | Properties | Extends |
  // ### Exported Functions (N found)
  // | Function | Params | Return | File |
  // ### API Endpoints (N found)
  // | Method | Path | Handler | File |
  // ### Database Entities (N found)
  // | Entity | Columns | Relations |
  // ### Parse Warnings
  // - (list parseErrors if any)
}
```

### Step 5: Update generate.ts

Add to `inputSchema`:

```typescript
source_code_path: z.string().max(500).optional()
  .refine((p) => !p || !p.includes(".."), { message: "Path must not contain .." })
  .describe("Path to source code directory for code-aware generation (TypeScript projects)"),
```

Add to `GenerateDocumentArgs` interface and `handleGenerateDocument`:

```typescript
// After upstream IDs block, before template section:
let codeContextBlock = "";
if (source_code_path && (doc_type === "detail-design" || doc_type === "test-spec")) {
  try {
    const { analyzeTypeScript } = await import("../lib/code-analyzer.js");
    const { formatCodeContext } = await import("../lib/code-context-formatter.js");
    const codeCtx = await analyzeTypeScript(source_code_path);
    codeContextBlock = formatCodeContext(codeCtx);
    logger.info({ fileCount: codeCtx.fileCount, classes: codeCtx.classes.length }, "Code analysis complete");
  } catch (err) {
    logger.warn({ err, source_code_path }, "Code analysis failed — proceeding without code context");
  }
}
// Insert codeContextBlock into sections array
```

### Step 6: Update CLI generate command

In `src/cli/commands/generate.ts`, add `--source-code` arg:

```typescript
"source-code": { type: "string", description: "Path to source code for code-aware generation" },
```

Pass as `source_code_path` to `handleGenerateDocument`.

### Step 7: Create test fixtures

Create `tests/fixtures/sample-project/` with:
- `tsconfig.json` (minimal)
- `src/user.controller.ts` (Express route handler)
- `src/user.entity.ts` (TypeORM entity)
- `src/user.service.ts` (class with methods)

### Step 8: Write tests

- `code-analyzer.test.ts`: test class extraction, function extraction, endpoint detection, entity detection, error handling, file limit
- `code-context-formatter.test.ts`: test markdown output format, empty context, large context truncation

### Step 9: Integration test in generate tool

Add test case to `tests/unit/tools.test.ts`:
- `generate_document` with `source_code_path` pointing to fixtures
- Verify output contains "## Source Code Context" section
- Verify class/function tables rendered

## Todo List

- [ ] Install ts-morph dependency
- [ ] Add CODE_ANALYSIS_FAILED error code
- [ ] Create `src/lib/code-analyzer.ts` with analyzeTypeScript()
- [ ] Create `src/lib/code-context-formatter.ts` with formatCodeContext()
- [ ] Update `src/tools/generate.ts` — add source_code_path param + inject code context
- [ ] Update `src/cli/commands/generate.ts` — add --source-code flag
- [ ] Create test fixtures in `tests/fixtures/sample-project/`
- [ ] Write `tests/unit/code-analyzer.test.ts`
- [ ] Write `tests/unit/code-context-formatter.test.ts`
- [ ] Add integration test case in tools.test.ts
- [ ] Run full test suite — verify 215+ tests still pass
- [ ] Run `npm run lint` — verify no type errors

## Success Criteria

1. `generate_document` with `source_code_path` produces output containing real class/function signatures
2. Without `source_code_path`, behavior is identical to current (backward compat)
3. Parse errors logged as warnings, generation proceeds without code context
4. All new tests pass; existing 215 tests unaffected
5. `sekkei generate detail-design --source-code ./src` works in CLI

## Risk Assessment

| Risk | Probability | Impact | Mitigation |
|------|------------|--------|------------|
| ts-morph slow on large projects | Medium | Medium | MAX_FILES=100 limit, 10s timeout, dispose Project after use |
| ts-morph bundle size (~15MB) | Low | Low | Dev dependency only if needed; tree-shaking works |
| Complex decorator patterns not detected | Medium | Low | Start with Express/TypeORM; extensible pattern list |
| tsconfig.json not found in project | Medium | Low | Fallback to glob `**/*.ts`; warn in logs |

## Security Considerations

- `source_code_path` validated: no `..` traversal, must be a real directory
- Source code content never sent to output — only signatures/metadata extracted
- No file system writes during analysis
- ts-morph operates in read-only mode (no AST modifications)

## Next Steps

- After implementation: test with real Sekkei codebase as dogfooding
- Python support: use stdlib `ast` module via python-bridge (deferred to Phase 4+)
- Java support: consider tree-sitter or java-parser (deferred)
- Consider caching CodeContext to avoid re-parsing on repeated generations
