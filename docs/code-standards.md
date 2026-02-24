# Code Standards & Conventions

## TypeScript Standards

### File Organization

All source files are ESM modules with `.ts` extension. Use `filename-pattern.ts` (kebab-case) for clarity.

```
src/
├── server.ts              # Main entry point, McpServer setup
├── index.ts               # Exports for CLI/consumption
├── config.ts              # Env var loading
├── lib/                   # Core business logic
│   ├── errors.ts          # SekkeiError class
│   ├── logger.ts          # Pino logger
│   ├── validator.ts       # Document validation
│   ├── manifest-manager.ts # Manifest CRUD
│   ├── template-loader.ts  # Template I/O
│   ├── template-resolver.ts # Template override logic
│   ├── python-bridge.ts    # Python process execution
│   ├── resolve-output-path.ts # Doc type → path mapping
│   ├── structure-validator.ts  # Numbered dir validation
│   ├── id-extractor.ts     # Cross-reference ID extraction
│   ├── merge-documents.ts  # Split doc assembly
│   ├── generation-instructions.ts # AI prompt building
│   └── screen-design-instructions.ts # Screen design specific
├── tools/                 # MCP tool handlers (12 tools)
│   ├── generate.ts        # generate_document tool (v3 + Phase A)
│   ├── validate.ts        # validate_document tool (4 modes)
│   ├── chain-status.ts    # get_chain_status tool
│   ├── export.ts          # export_document tool (+ gsheet, Phase A read_only)
│   ├── get-template.ts    # get_template tool
│   ├── translate.ts       # translate_document tool
│   ├── glossary.ts        # manage_glossary tool (+ native integration)
│   ├── update.ts          # analyze_update tool (+ staleness, Phase A diff)
│   ├── simulate-impact.ts # simulate_change_impact tool (Phase A)
│   ├── import-document.ts # import_document tool (Phase A)
│   ├── validate-chain.ts  # validate_chain tool (Phase A)
│   └── rfp-workspace.ts   # manage_rfp_workspace tool
├── types/                 # Type definitions
│   ├── documents.ts       # Core domain types
│   ├── manifest-schemas.ts # Zod validation schemas
│   └── [individual tool types]
└── resources/             # MCP resource handlers
    ├── templates.ts       # Template URI resolution
    ├── rfp-instructions.ts # RFP workspace resource
    └── index.ts           # Resource registration
```

### Import Conventions

**All imports use `.js` extensions (ESM requirement):**

```typescript
// ✅ Correct
import { resolveOutputPath } from "../lib/resolve-output-path.js";
import type { DocType } from "../types/documents.js";

// ❌ Wrong
import { resolveOutputPath } from "../lib/resolve-output-path";
import type { DocType } from "../types/documents";
```

### Type Definitions

**Use `type` imports for type-only imports:**

```typescript
import type { ProjectConfig, Language } from "../types/documents.js";
import { readFile } from "node:fs/promises";
```

**Export types and enums together:**

```typescript
// documents.ts
export const DOC_TYPES = ["requirements", "functions-list", ...] as const;
export type DocType = (typeof DOC_TYPES)[number];

export interface ProjectConfig {
  project: { ... };
  chain: { ... };
}
```

## Naming Conventions

### Variables & Functions

Use camelCase for variables, functions, and methods:

```typescript
const configPath = "sekkei.config.yaml";
const uploadedAt = Date.now();

function resolveOutputPath(docType: DocType) { ... }
async function readManifest(path: string) { ... }
```

### Constants

Use UPPER_SNAKE_CASE for constants and regex patterns:

```typescript
const MAX_CONFIG_SIZE = 100 * 1024; // 100KB
const MAX_MANIFEST_SIZE = 50 * 1024; // 50KB
const REQUIRED_FILES = ["04-functions-list.md", "10-glossary.md"];
const VERSION_SUFFIX_RE = /-(v\d+|final|old|copy)\./i;
const KEBAB_RE = /^[a-z][a-z0-9-]+$/;
const ID_PATTERN = /\b(F|REQ|NFR|SCR|TBL|API|CLS|DD|TS|SEC|PP|TP|UT|IT|ST|UAT|OP|MIG|EV|MTG|ADR|IF|PG)-(\d{1,4})\b/g;
```

### Classes & Types

Use PascalCase for classes and interfaces:

```typescript
export class SekkeiError extends Error { ... }
export class McpServer { ... }
export interface ProjectConfig { ... }
export interface TemplateData { ... }
```

### File & Folder Names

Use kebab-case for all TypeScript files:

```
✅ template-loader.ts, python-bridge.ts, resolve-output-path.ts
❌ templateLoader.ts, pythonBridge.ts, resolveOutputPath.ts
```

### Japanese / Keigo Terminology

When using Japanese in constants or type definitions, use the term as-is:

```typescript
export const KEIGO_LEVELS = ["丁寧語", "謙譲語", "simple"] as const;
export type KeigoLevel = (typeof KEIGO_LEVELS)[number];
```

For documentation and comments, use katakana for foreign words:

```typescript
// テンプレート (template) — フォーマット (format) を使用
const templateFormat = "markdown";
```

## Cross-Reference ID Prefixes

All extracted IDs follow the pattern `{PREFIX}-{NUMBER}` (e.g., `REQ-001`). Register new prefixes in `id-extractor.ts`:

| Prefix | Document Type | Description | Example |
|--------|---------------|-------------|---------|
| F- | functions-list | Feature/function ID | F-001 |
| REQ- | requirements | Requirement ID | REQ-003 |
| SCR- | basic-design, detail-design | Screen/component ID | SCR-010 |
| TBL- | basic-design, detail-design | Table/database ID | TBL-005 |
| API- | detail-design | API endpoint ID | API-008 |
| CLS- | detail-design | Class/entity ID | CLS-012 |
| UT- | ut-spec | Unit test case ID | UT-020 |
| IT- | it-spec | Integration test case ID | IT-015 |
| ST- | st-spec | System test case ID | ST-010 |
| UAT- | uat-spec | User acceptance test case ID | UAT-003 |
| EV- | test-evidence | Evidence entry ID | EV-001 |
| MTG- | meeting-minutes | Meeting record ID | MTG-001 |
| ADR- | decision-record | Architecture Decision Record | ADR-001 |
| IF- | interface-spec | Interface specification ID | IF-001 |
| PG- | screen-design | Screen design/mockup ID | PG-001 |

**Rules:**
- Each prefix must be unique (no collisions across documents)
- Numbers are zero-padded (001-999)
- IDs appear in tables, headings, and cross-reference comments
- `id-extractor.ts` maintains `ID_TYPES` enum and `ID_PATTERN` regex

## Design Patterns (Phase 3+)

### Handler Extraction Pattern

For modules used by both MCP tools and CLI, export pure handler functions:

```typescript
// lib/staleness-detector.ts
export async function handleDetectStaleness(
  config: ProjectConfig,
  sinceDate?: string,
): Promise<StalenessReport> {
  // Pure business logic, no tool-specific code
  // Returns structured data
}

// tools/update.ts
async ({ config_path, since }) => {
  const config = await readConfig(config_path);
  const report = await handleDetectStaleness(config, since);
  return { ok: true, data: report };
}

// cli/commands/watch.ts
async function watchCommand(config: ProjectConfig, options: WatchOptions) {
  const report = await handleDetectStaleness(config, options.since);
  // Format for CLI output
}
```

**Benefit:** Reusable across MCP tools, CLI, and future integrations.

### Dynamic Import Pattern for Optional Dependencies

For optional peer dependencies (ts-morph, googleapis), use dynamic imports:

```typescript
// lib/code-analyzer.ts
export async function analyzeSourceCode(paths: string[]): Promise<CodeContext> {
  // Lazy import — fails gracefully if ts-morph not installed
  const { Project } = await import("ts-morph");
  const project = new Project({ tsConfigFilePath: "..." });
  // ...
}

// lib/google-sheets-exporter.ts
export async function exportToGoogleSheets(
  tables: Table[],
  config: GoogleSheetsConfig,
): Promise<ExportResult> {
  const { google } = await import("googleapis");
  const { getAuthClient } = await import("./google-auth.js");
  // ...
}
```

**Benefit:** Core stays lightweight; optional features only load if needed.

### Config Extension Pattern

For new optional config fields, use optional properties:

```typescript
// types/documents.ts
export interface ProjectConfig {
  project: { /* ... */ };
  chain: { /* ... */ };
  features?: FeatureConfig[];

  // Phase 3+ optional sections
  feature_file_map?: Record<string, string[]>;  // staleness mapping
  google?: GoogleSheetsConfig;                   // sheets export
  backlog?: BacklogConfig;                       // future: Linear/Jira
  structure_rules?: StructureRuleConfig;         // anti-chaos rules
}
```

**Validation:** Zod handles optional fields gracefully.

### Git Argument Validation Pattern

For git operations, validate arguments strictly:

```typescript
// lib/staleness-detector.ts
export async function detectStaleness(
  config: ProjectConfig,
  sinceDate?: string,
): Promise<StalenessReport> {
  // Validate sinceDate format before using in git command
  if (sinceDate && !/^\d{4}-\d{2}-\d{2}$/.test(sinceDate)) {
    throw new SekkeiError("STALENESS_ERROR", "Invalid date format");
  }

  // Use simple-git API (not shell) to avoid injection
  const git = simpleGit();
  const log = await git.log({ from: sinceDate });
  // ...
}
```

**Benefit:** No shell injection risk; type-safe git operations.

## Error Handling

### SekkeiError Class

All errors must use `SekkeiError` with a typed code:

```typescript
// errors.ts
export class SekkeiError extends Error {
  constructor(
    public code: string,
    message: string,
  ) {
    super(message);
    this.name = "SekkeiError";
  }

  toClientMessage(): string {
    // Returns error message without stack trace (safe for clients)
    return `[${this.code}] ${this.message}`;
  }
}
```

### Error Codes

Use SCREAMING_SNAKE_CASE for error codes (14+ codes):

```typescript
// Core
TEMPLATE_NOT_FOUND, INVALID_DOC_TYPE, INVALID_LANGUAGE, PARSE_ERROR,
CONFIG_ERROR, GENERATION_FAILED, VALIDATION_FAILED, MANIFEST_ERROR,
MOCKUP_ERROR, CODE_ANALYSIS_FAILED, STALENESS_ERROR, STRUCTURE_RULES_ERROR,
GOOGLE_EXPORT_FAILED, BACKLOG_SYNC_FAILED,
RFP_WORKSPACE_ERROR, RFP_PHASE_ERROR

// Examples:
throw new SekkeiError("TEMPLATE_NOT_FOUND", "Template not found");
throw new SekkeiError("CODE_ANALYSIS_FAILED", "AST analysis timeout");
throw new SekkeiError("STRUCTURE_RULES_ERROR", "Rule validation failed");
```

### Try-Catch Pattern

Always catch and wrap errors in SekkeiError:

```typescript
export async function readManifest(path: string): Promise<Manifest> {
  let raw: string;
  try {
    raw = await readFile(path, "utf-8");
  } catch (err: unknown) {
    throw new SekkeiError("MANIFEST_ERROR", `Failed to read: ${path}`);
  }

  if (raw.length > MAX_MANIFEST_SIZE) {
    throw new SekkeiError("MANIFEST_ERROR", "Manifest exceeds size limit");
  }

  try {
    const parsed = parseYaml(raw);
    return ManifestSchema.parse(parsed);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    throw new SekkeiError("MANIFEST_ERROR", `Validation failed: ${msg}`);
  }
}
```

## Logging

### Logger Configuration

Use Pino logger (writes to stderr fd 2 only):

```typescript
// logger.ts
import pino from "pino";

export const logger = pino({
  level: process.env.LOG_LEVEL || "info",
  transport: {
    target: "pino-pretty",
  },
});
```

### Logging Patterns

**Use structured logging:**

```typescript
// ✅ Correct — structured object
logger.info({ config_path, docType }, "Generating document");
logger.error({ err, path }, "File read failed");

// ❌ Wrong — string concatenation
logger.info(`Config at ${config_path}`);
logger.error(`Error: ${err}`);
```

**Log level guidelines:**

| Level | Use Case | Example |
|-------|----------|---------|
| debug | Detailed flow | "Checking template override dir" |
| info | Key operations | "Manifest written" |
| warn | Recoverable issues | "Config missing optional field" |
| error | Tool failures | "Template not found" |

**Never log to stdout — only stderr:**

```typescript
// ✅ Correct
logger.info({ data }, "message");

// ❌ Wrong
console.log("message");
console.error("error");
```

## State Machines & Plan Management

### Change Request State Machine

CR lifecycle follows strict state transitions (in `src/lib/cr-state-machine.ts`):

```
DRAFT → SUBMITTED → ANALYZING → APPROVED → PROPAGATING → COMPLETED
  ↑                               ↓
  └──────────── REJECTED ─────────┘
```

**Transition rules:**
- Only forward transitions allowed (no backtracking)
- Each transition updates timestamp and optional metadata
- Git checkpoint created before propagation (rollback-safe)

**Pattern:**
```typescript
export interface ChangeRequest {
  id: string;
  status: "draft" | "submitted" | "analyzing" | "approved" | "propagating" | "completed" | "rejected";
  created_at: number;
  updated_at: number;
  doc_type: DocType;
  summary: string;
  // ... context-specific fields
}

// Transition function
export async function transitionCR(cr: ChangeRequest, newStatus: string) {
  const valid = VALID_TRANSITIONS[cr.status];
  if (!valid.includes(newStatus)) {
    throw new SekkeiError("CR_INVALID_TRANSITION", `Cannot go from ${cr.status} to ${newStatus}`);
  }
  cr.status = newStatus;
  cr.updated_at = Date.now();
}
```

### Plan State Machine

Generation plans track multi-phase document workflows (in `src/lib/plan-state.ts`):

```
PENDING → IN_PROGRESS → COMPLETED
   ↓           ↓
 CANCELLED  SUSPENDED
```

**Key fields:**
- `plan_id` — directory name (not timestamp-based, for reliability)
- `phases` — array of phase objects with status and completion %
- `feature_file_map` — for staleness tracking
- Safe phase iteration (phases sorted deterministically)

**Pattern:**
```typescript
export interface GenerationPlan {
  plan_id: string;
  status: "pending" | "in_progress" | "completed" | "suspended" | "cancelled";
  created_at: number;
  phases: {
    key: string; // "phase-01-requirements"
    doc_type: DocType;
    status: "pending" | "in_progress" | "complete";
    output_path: string;
  }[];
  feature_file_map?: Record<string, string>; // For staleness detection
}

// Safe iteration
const sortedPhases = plan.phases.sort((a, b) => a.key.localeCompare(b.key));
for (const phase of sortedPhases) {
  // Process phase...
}
```

### CR Propagation Safety

**Max steps guard:** Prevent infinite loops in `propagate_next` action
```typescript
export const MAX_PROPAGATION_STEPS = 20; // Fail-safe at 2× expected steps

// In propagation loop:
if (propagationStep >= MAX_PROPAGATION_STEPS) {
  throw new SekkeiError("CR_PROPAGATION_LIMIT", "Max propagation steps exceeded");
}
```

**Bounds checking:** Always check array access before using
```typescript
// ✅ Correct order
if (step >= list.length) throw error;
const item = list[step]; // Safe

// ❌ Wrong
const item = list[step];
if (step >= list.length) throw error; // Too late
```

## Schema & Validation

### Zod Schemas

All tool inputs must have Zod schemas:

```typescript
import { z } from "zod";

const inputSchema = {
  config_path: z.string()
    .refine((p) => /\.ya?ml$/i.test(p), { message: "Must be .yaml file" })
    .describe("Path to sekkei.config.yaml"),

  doc_type: z.enum(DOC_TYPES)
    .describe("Type of document"),

  output_path: z.string().max(500)
    .refine((p) => !p.includes(".."), { message: "No directory traversal" })
    .describe("Output file path"),
};
```

**Schema guidelines:**

- Always add `.describe()` for MCP tool help text
- Use `.refine()` for custom validation logic
- Set size limits: `.max(500_000)` for content, `.max(500)` for paths
- Use enums to constrain values: `z.enum(DOC_TYPES)`

### Type Safety

**Parse all inputs, never trust user data:**

```typescript
async ({ config_path, doc_type }) => {
  // config_path and doc_type are already validated by Zod
  // Type-safe to use directly
  const config = await readConfig(config_path); // safe
  const template = await loadTemplate(doc_type); // safe
}
```

## Document Types — v2.0

### Constants

All document types defined in `types/documents.ts`:

```typescript
// v2.0: 20 types organized by phase
export const DOC_TYPES = [
  // Requirements phase
  "requirements", "nfr", "functions-list", "project-plan",
  // Design phase
  "basic-design", "security-design", "detail-design",
  // Test phase
  "test-plan", "ut-spec", "it-spec", "st-spec", "uat-spec",
  // Supplementary
  "crud-matrix", "traceability-matrix", "operation-design",
  "migration-design", "sitemap", "test-evidence", "meeting-minutes",
  "decision-record", "interface-spec", "screen-design"
] as const;

// Phase grouping (NEW v2.0)
export const PHASES = ["requirements", "design", "test", "supplementary"] as const;
export type Phase = (typeof PHASES)[number];

export const PHASE_MAP: Record<DocType, Phase> = {
  requirements: "requirements",
  nfr: "requirements",
  "functions-list": "requirements",
  "project-plan": "requirements",
  "basic-design": "design",
  "security-design": "design",
  "detail-design": "design",
  "test-plan": "test",
  "ut-spec": "test",
  "it-spec": "test",
  "st-spec": "test",
  "uat-spec": "test",
  // ... supplementary types
};

export const SPLIT_DOC_TYPES = [
  "basic-design", "detail-design"
] as const; // v2.0: Only 2 split types (removed test-spec split)

export const PROJECT_TYPES = [
  "web", "mobile", "api", "desktop", "lp", "internal-system", "saas", "batch"
] as const;
```

**Removed:** `overview` (merged into requirements phase)
**Added:** `nfr`, `project-plan`, `security-design`, `test-plan`, `ut-spec`, `it-spec`, `st-spec`, `uat-spec`, `sitemap`
**Changed:** Split types now only `basic-design` and `detail-design` (test specs are not split)

### Feature Config

Features use `name` (kebab-case) and `display` (human label):

```typescript
export interface FeatureConfig {
  id: string;      // "SAL" — short mnemonic
  name: string;    // "sales-management" — kebab-case
  display: string; // "販売管理" — human label (JP ok)
}
```

## Manifest Structure

### Manifest Files (`_index.yaml`)

Located at output root, tracks split document structure:

```yaml
version: "1.0"
project: "ProjectName"
language: "ja"
documents:
  basic-design:
    type: "split"
    status: "in-progress"
    shared:
      - file: "03-system/system-architecture.md"
        section: "system-architecture"
        title: "システムアーキテクチャ"
    features:
      - name: "sales-management"
        display: "販売管理"
        file: "05-features/sales-management/basic-design.md"
    merge_order: ["shared", "features"]
```

**ManifestFeatureEntry uses `name` field (not `id`):**

```typescript
export interface ManifestFeatureEntry {
  name: string;    // ← kebab-case folder name
  display: string; // ← human label
  file: string;    // ← path to generated file
}
```

## Configuration

### ProjectConfig Type

Maps to `sekkei.config.yaml` structure:

```typescript
export interface ProjectConfig {
  project: {
    name: string;
    type: ProjectType;
    stack: string[];
    team_size: number;
    language: Language;
    keigo: KeigoLevel;
    industry?: string;
  };
  output: {
    directory: string;
  };
  chain: {
    rfp: string; // path to RFP document
    // Requirements phase
    requirements: ChainEntry;
    nfr?: ChainEntry;
    functions_list: ChainEntry;
    project_plan?: ChainEntry;
    // Design phase
    basic_design: SplitChainEntry;
    security_design?: ChainEntry;
    detail_design: SplitChainEntry;
    // Test phase
    test_plan?: ChainEntry;
    ut_spec?: ChainEntry;
    it_spec?: ChainEntry;
    st_spec?: ChainEntry;
    uat_spec?: ChainEntry;
    // Supplementary
    operation_design?: ChainEntry;
    migration_design?: ChainEntry;
    glossary?: ChainEntry;
  };
  features?: FeatureConfig[];
}
```

### Chain Entry Types

```typescript
// Single-file documents
export interface ChainEntry {
  status: "pending" | "in-progress" | "complete";
  input?: string;
  output?: string;
}

// Split documents
export interface SplitChainEntry {
  status: "pending" | "in-progress" | "complete";
  system_output?: string;   // path to shared content
  features_output?: string; // path prefix for features
  global_output?: string;   // path to global content (test-spec)
}
```

## Output Paths — v2.0

### Path Resolution Rules

Use `resolveOutputPath(docType, scope, featureName)` per phase:

```typescript
resolveOutputPath("requirements")       // "02-requirements/requirements.md"
resolveOutputPath("nfr")                // "02-requirements/nfr.md"
resolveOutputPath("project-plan")       // "02-requirements/project-plan.md"
resolveOutputPath("functions-list")     // "04-functions-list.md"
resolveOutputPath("basic-design", "shared")  // "03-system/basic-design.md"
resolveOutputPath("basic-design", "feature", "sales-management")
  // "05-features/sales-management/basic-design.md"
resolveOutputPath("security-design")    // "03-system/security-design.md"
resolveOutputPath("detail-design", "feature", "sales-management")
  // "05-features/sales-management/detail-design.md"
resolveOutputPath("test-plan")          // "08-test/test-plan.md"
resolveOutputPath("ut-spec")            // "08-test/ut-spec.md"
resolveOutputPath("it-spec")            // "08-test/it-spec.md"
resolveOutputPath("st-spec")            // "08-test/st-spec.md"
resolveOutputPath("uat-spec")           // "08-test/uat-spec.md"
```

**Numbered Structure Rules (v2.0):**

- `02-requirements/` — requirements phase (requirements.md, nfr.md, project-plan.md)
- `03-system/` — system-level design (basic-design.md, security-design.md, shared sections)
- `04-functions-list.md` — feature/function listing
- `05-features/` — per-feature design specifications
- `06-data/` — data & migration design
- `07-operations/` — operation procedures
- `08-test/` — test phase (test-plan.md, ut-spec.md, it-spec.md, st-spec.md, uat-spec.md)
- `09-ui/` — screen design & mockups
- `10-glossary.md` — terminology glossary

## Cross-Reference IDs — v2.0

### ID Patterns by Phase

Used for linking documents and V-model symmetric validation:

```typescript
// Requirements phase
F-xxx  (functions-list)
REQ-xxx (requirements)
NFR-xxx (nfr)
PLAN-xxx (project-plan)

// Design phase
SCR-xxx (basic-design screens)
TBL-xxx (basic-design tables)
SEC-xxx (security-design)
API-xxx (detail-design APIs)
CLS-xxx (detail-design classes)

// Test phase (V-model symmetric)
TEST-xxx (test-plan)
UT-xxx (ut-spec — validates against detail-design)
IT-xxx (it-spec — validates against detail-design)
ST-xxx (st-spec — validates against basic-design + detail-design)
UAT-xxx (uat-spec — validates against requirements)

// Supplementary (Phase A)
OP-xxx (operation-design)
MIG-xxx (migration-design)
EV-xxx (test-evidence)
MTG-xxx (meeting-minutes / 議事録)
ADR-xxx (decision-record)
IF-xxx (interface-spec)
PG-xxx (screen-design)
```

**Removed:** `overview` type (no ID prefix)
**Changed:** Test specs are individual (ut-spec, it-spec, st-spec, uat-spec) with V-model symmetric validation

### Extraction & Validation (v2.0)

```typescript
// In lib/id-extractor.ts
const idPattern = /\b(F|REQ|NFR|PLAN|SCR|TBL|SEC|API|CLS|TEST|UT|IT|ST|UAT|OP|MIG|EV|MTG|ADR|IF|PG)-(\d{1,4})\b/g;
const ids = [...content.matchAll(idPattern)].map(m => `${m[1]}-${m[2]}`);

// V-model symmetric validation per test level
// In tools/validate.ts
if (docType === "ut-spec") {
  const upstreamIds = extractIds(detailDesignContent);
  validateReferences(content, upstreamIds);
}
if (docType === "st-spec") {
  const basicDesignIds = extractIds(basicDesignContent);
  const detailDesignIds = extractIds(detailDesignContent);
  validateReferences(content, [...basicDesignIds, ...detailDesignIds]);
}
if (docType === "uat-spec") {
  const requirementIds = extractIds(requirementsContent);
  validateReferences(content, requirementIds);
}

// Compare with upstream
const upstreamIds = extractIds(upstreamContent);
const missing = referencedIds.filter(id => !upstreamIds.includes(id));
```

## Testing

### Test File Naming

Use `.test.ts` suffix in tests:

```
tests/
├── unit/
│   ├── validator.test.ts
│   ├── id-extractor.test.ts
│   └── python-bridge.test.ts
├── integration/
│   ├── generate.integration.test.ts
│   └── export.integration.test.ts
└── tmp/
```

### Test Pattern

Access tool handlers via internal interface:

```typescript
import { McpServer } from "../src/server.js";

let server: McpServer;

beforeAll(() => {
  server = new McpServer({ /* config */ });
  // Register tools...
});

it("should validate document", async () => {
  const handler = (server as any)._registeredTools["validate_document"].handler;
  const result = await handler({
    content: "...",
    doc_type: "requirements",
  }, {});

  expect(result).toBeDefined();
});
```

### __dirname in ESM

Use this pattern for file paths in tests:

```typescript
import { fileURLToPath } from "node:url";
import { dirname } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const tmpDir = join(__dirname, "../tmp");
```

## Code Quality

### Linting & Type Checking

```bash
npm run lint     # tsc --noEmit (type check only)
npm run build    # tsc (compile)
npm test         # Jest with ESM
```

### ESLint Config (if used)

Recommended rules for TypeScript:

```javascript
{
  "parser": "@typescript-eslint/parser",
  "extends": [
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended",
  ],
  "rules": {
    "@typescript-eslint/no-explicit-any": "warn",
    "@typescript-eslint/explicit-return-types": "warn",
    "no-console": "error",  // Use logger instead
  },
}
```

### Import Organization

Group imports in this order:
1. Node built-ins (`node:fs`, `node:path`)
2. External packages (`zod`, `yaml`, `pino`)
3. MCP SDK (`@modelcontextprotocol/sdk`)
4. Relative imports (`../lib`, `../types`)
5. Type-only imports (at end)

```typescript
import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { z } from "zod";
import { parse as parseYaml } from "yaml";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { logger } from "../lib/logger.js";
import type { ProjectConfig } from "../types/documents.js";
```

## Comments & Documentation

### JSDoc Comments

Use JSDoc for public functions and classes:

```typescript
/**
 * Load and parse a template with YAML frontmatter.
 * Checks override dir first, falls back to default templates.
 *
 * @param docType - Document type (e.g., "basic-design")
 * @param lang - Target language ("ja", "en", "vi")
 * @returns Template data with metadata + markdown content
 * @throws {SekkeiError} If template not found or parsing fails
 */
export async function loadTemplate(
  docType: DocType,
  lang: Language,
): Promise<TemplateData> {
  // ...
}
```

### Inline Comments

Use comments for non-obvious logic:

```typescript
// Check override dir first with path containment validation
const overrideDir = process.env.SEKKEI_TEMPLATE_OVERRIDE_DIR;
if (overrideDir && !overrideDir.includes("..")) {
  // Safe to use
}

// Skip index.md files — nav aids only, not spec content
return files.filter(f => f !== "index.md" && !f.endsWith("/index.md"));
```

### Avoid Comments For

- Self-documenting code (good variable/function names are better)
- Code that should be deleted (just delete it)
- Version history (use git commits)

