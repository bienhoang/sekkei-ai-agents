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
const ID_PATTERN = /\b(F|REQ|NFR|ARC|DB|SEC|SCR|TBL|API|CLS|OP|MIG|BATCH|RPT|SCN|TST|UT|IT|ST|UAT|TR|EV|MTG|ADR|IF)-(\d{1,4})\b/g;
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

## Cross-Reference ID Prefixes (25 Total — IPA v2.7)

All extracted IDs follow the pattern `{PREFIX}-{NUMBER}` (e.g., `REQ-001`). Register new prefixes in `id-extractor.ts`:

| Prefix | Document Type | Phase | Description | Example |
|--------|---------------|-------|-------------|---------|
| F- | functions-list | requirements | Feature/function ID | F-001 |
| REQ- | requirements | requirements | Requirement ID | REQ-003 |
| NFR- | nfr | requirements | Non-functional requirement ID | NFR-005 |
| ARC- | architecture-design | design | Architecture layer ID | ARC-001 |
| DB- | db-design | design | Database/table ID | DB-005 |
| SEC- | security-design | design | Security specification ID | SEC-002 |
| SCR- | basic-design | design | Screen/component ID | SCR-010 |
| TBL- | basic-design | design | Table/entity ID | TBL-005 |
| API- | detail-design | design | API endpoint ID | API-008 |
| CLS- | detail-design | design | Class/entity ID | CLS-012 |
| OP- | operation-design | supplementary | Operations procedure ID | OP-003 |
| MIG- | migration-design | supplementary | Migration step ID | MIG-007 |
| BATCH- | batch-design | supplementary | Batch processing ID | BATCH-001 |
| RPT- | report-design | supplementary | Report/form ID | RPT-004 |
| SCN- | screen-design | supplementary | Screen design/mockup ID | SCN-015 |
| TST- | test-plan | test | Test plan section ID | TST-001 |
| UT- | ut-spec | test | Unit test case ID | UT-020 |
| IT- | it-spec | test | Integration test case ID | IT-015 |
| ST- | st-spec | test | System test case ID | ST-010 |
| UAT- | uat-spec | test | User acceptance test case ID | UAT-003 |
| TR- | test-result-report | test | Test result/evidence ID | TR-001 |
| EV- | test-evidence | supplementary | Test evidence entry ID | EV-001 |
| MTG- | meeting-minutes | supplementary | Meeting record ID | MTG-001 |
| ADR- | decision-record | supplementary | Architecture Decision Record | ADR-001 |
| IF- | interface-spec | supplementary | Interface specification ID | IF-001 |

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

Use SCREAMING_SNAKE_CASE for error codes (18 total codes):

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

## React Component Patterns (Dashboard)

Dashboard uses Recharts for charts and @xyflow/react for graph visualization:

```typescript
// Chart components (Recharts)
import { LineChart, Line, CartesianGrid, Tooltip, Legend } from "recharts";

export const TrendChart = ({ data }) => (
  <LineChart data={data}>
    <CartesianGrid strokeDasharray="3 3" />
    <Tooltip />
    <Legend />
    <Line type="monotone" dataKey="value" stroke="#2563eb" />
  </LineChart>
);

// Graph components (@xyflow/react + dagre)
import ReactFlow, { Node, Edge } from "@xyflow/react";
import "@xyflow/react/dist/style.css";

export const TraceabilityGraph = ({ nodes, edges }) => (
  <ReactFlow nodes={nodes} edges={edges} fitView>
    {/* DAG layout applied via dagre */}
  </ReactFlow>
);
```

**Icon Convention:** Use lucide-react for all UI icons (replaced emoji in v2.6.3)
```typescript
import { AlertCircle, CheckCircle, TrendingUp } from "lucide-react";
```

## State Machines & Documentation

See [code-practices.md](./code-practices.md) for detailed guidance on state machines, schema validation, document types, configuration, cross-references, testing patterns, code quality standards, and documentation practices.

