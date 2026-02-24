# Phase 04: Google Sheets Export (D1)
<!-- Updated: Validation Session 1 - Scope reduced to Sheets only, Google Docs dropped -->

## Context Links

- **Parent plan:** [plan.md](./plan.md)
- **Research:** [researcher-02-google-docs-and-backlog.md](./research/researcher-02-google-docs-and-backlog.md)
- **Existing export tool:** `src/tools/export.ts`
- **Excel exporter:** `src/lib/excel-exporter.ts`
- **Docx exporter:** `src/lib/docx-exporter.ts`
- **Export types:** EXPORT_FORMATS in `src/tools/export.ts`

## Overview

- **Priority:** P2
- **Status:** complete
- **Effort:** ~1 day
- **Group:** G4 (after core AI features in G1-G3)

Export Sekkei documents to Google Sheets (tabular data: requirements, test matrices, function lists). Google Docs dropped per validation — poor table rendering, complex API, users already have Word/PDF for full docs.

## Key Insights

- Google Sheets API is significantly simpler than Docs API (researcher-02: 1-2d vs 3-4d)
- Tabular doc types (functions-list, requirements, test-spec, crud-matrix, traceability-matrix) map directly to spreadsheet rows
- Google Docs markdown import is UI-only; API requires custom batchUpdate logic (researcher-02)
- Service account auth is simplest for server/CLI use; OAuth2 for user-delegated access
- Both APIs support Japanese text natively via UTF-8
- Drive auto-convert is NOT viable via API (researcher-02 ruled out)
- Extend existing EXPORT_FORMATS enum + handleExportDocument handler pattern

## Requirements

### Functional

1. New export format: `gsheet` — export tabular doc types to Google Sheets
2. ~~New export format: `gdoc`~~ — **DROPPED** per Validation Session 1
3. OAuth2 auth: service account JSON key or user consent flow
4. Config: `google.credentials_path` and `google.folder_id` in sekkei.config.yaml
5. Google Sheets export: one sheet per document, headers from markdown table columns, data rows populated
6. Google Docs export: headings, paragraphs, tables, lists converted from markdown
7. CLI: `sekkei export --format gsheet`
8. Return Google Drive file URL in export result

### Non-Functional

1. Auth credentials never logged or included in MCP output
2. Batch API calls to minimize HTTP round-trips (Sheets: batchUpdate, Docs: batchUpdate)
3. Rate limit handling: exponential backoff on 429 responses
4. Google API packages loaded lazily (dynamic import) — not required for offline use
5. File size: each new module under 200 lines

## Architecture

```
export_document tool (format=gsheet|gdoc)
          │
          ├── Load Google auth credentials from config
          │     ├── Service account: JSON key file
          │     └── OAuth2: token file + refresh
          │
          ▼
   GoogleAuthManager.getClient(configPath)
          │
          ▼
   ┌──────┴──────┐
   │   gsheet    │   gdoc
   ▼             ▼
GoogleSheetsExporter    GoogleDocsExporter
   │                    │
   ├── Parse markdown   ├── Parse markdown → AST
   │   tables           │   (using existing marked)
   ├── Create           ├── Create Google Doc
   │   spreadsheet      ├── batchUpdate: headings,
   ├── Write header     │   paragraphs, tables, lists
   │   + data rows      ├── Apply formatting
   └── Apply formatting └── Return Doc URL
       Return Sheet URL
```

### Config Extension

```yaml
# sekkei.config.yaml — new optional section
google:
  credentials_path: "./google-service-account.json"  # or OAuth token path
  auth_type: "service_account"  # or "oauth2"
  folder_id: "1abc..."  # Google Drive folder for exports (optional)
```

### Data Structures

```typescript
// src/lib/google-auth.ts

export interface GoogleAuthConfig {
  credentials_path: string;
  auth_type: "service_account" | "oauth2";
  folder_id?: string;
}

// src/lib/google-sheets-exporter.ts

export interface SheetsExportResult {
  spreadsheet_id: string;
  spreadsheet_url: string;
  sheet_count: number;
  row_count: number;
}

// src/lib/google-docs-exporter.ts

export interface DocsExportResult {
  document_id: string;
  document_url: string;
  section_count: number;
}
```

## Related Code Files

### Create

| File | Purpose | Est. Lines |
|------|---------|------------|
| `src/lib/google-auth.ts` | Auth manager: service account + OAuth2 | ~80 |
| `src/lib/google-sheets-exporter.ts` | Markdown tables → Google Sheets | ~180 |
| `tests/unit/google-sheets-exporter.test.ts` | Unit tests (mocked API) | ~120 |

### Modify

| File | Change |
|------|--------|
| `src/tools/export.ts` | Add `gsheet` to EXPORT_FORMATS; add `config_path` param; branch to Sheets exporter |
| `src/cli/commands/export-cmd.ts` | Support `--format gsheet` and `--format gdoc` |
| `src/lib/errors.ts` | Add `GOOGLE_EXPORT_FAILED` error code |
| `src/types/documents.ts` | Add `google` section to ProjectConfig |
| `package.json` | Add `googleapis`, `google-auth-library` as optional peerDependencies (not bundled) |

## Implementation Steps

### Step 1: Install Google API packages

```bash
cd sekkei/packages/mcp-server && npm install googleapis google-auth-library
```

Consider making these optional peer dependencies to avoid bloating installs for users who don't need Google export.

### Step 2: Add error code + config types

In `src/lib/errors.ts`, add `"GOOGLE_EXPORT_FAILED"` to `SekkeiErrorCode` union.

In `src/types/documents.ts`, add to `ProjectConfig`:

```typescript
/** Google Workspace export config */
google?: {
  credentials_path: string;
  auth_type: "service_account" | "oauth2";
  folder_id?: string;
};
```

### Step 3: Create google-auth.ts

```typescript
// src/lib/google-auth.ts
import { SekkeiError } from "./errors.js";
import { logger } from "./logger.js";

export async function getGoogleAuthClient(config: GoogleAuthConfig) {
  // Dynamic import to avoid requiring googleapis when not used
  const { google } = await import("googleapis");
  const { GoogleAuth } = await import("google-auth-library");

  if (config.auth_type === "service_account") {
    const auth = new GoogleAuth({
      keyFile: config.credentials_path,
      scopes: [
        "https://www.googleapis.com/auth/spreadsheets",
        "https://www.googleapis.com/auth/documents",
        "https://www.googleapis.com/auth/drive.file",
      ],
    });
    return auth.getClient();
  }
  // OAuth2: load saved token, refresh if expired
  // ...
}
```

### Step 4: Create google-sheets-exporter.ts (MVP)

```typescript
// src/lib/google-sheets-exporter.ts
import { SekkeiError } from "./errors.js";
import { logger } from "./logger.js";

/** Extract markdown tables from content → array of { headers, rows } */
export function parseMarkdownTables(content: string): { headers: string[]; rows: string[][] }[] {
  // Split by markdown table pattern: | header | header |
  // Parse separator row (|---|---|)
  // Parse data rows
}

export async function exportToGoogleSheets(opts: {
  content: string;
  docType: string;
  projectName: string;
  authClient: unknown;
  folderId?: string;
}): Promise<SheetsExportResult> {
  const { google } = await import("googleapis");
  const sheets = google.sheets({ version: "v4", auth: opts.authClient });
  const drive = google.drive({ version: "v3", auth: opts.authClient });

  // 1. Create spreadsheet with title: "{projectName} - {docType}"
  // 2. Parse markdown tables from content
  // 3. For each table: create sheet, write headers + rows via batchUpdate
  // 4. Apply formatting: bold headers, auto-resize columns, borders
  // 5. Move to folder if folderId provided
  // 6. Return URL + stats
}
```

Markdown table → Sheets mapping:
- Each markdown table → one Sheet tab
- Tab name from preceding H2/H3 heading (e.g., "機能一覧", "テストケース")
- Header row: bold, frozen, background color
- Data rows: plain text, auto-resize columns

### Step 5: Create google-docs-exporter.ts

```typescript
// src/lib/google-docs-exporter.ts
import { SekkeiError } from "./errors.js";
import { logger } from "./logger.js";

/** Convert markdown to Google Docs batchUpdate requests */
export function markdownToDocsRequests(content: string): unknown[] {
  // Use marked to parse markdown → tokens
  // Map tokens to Google Docs API requests:
  //   heading → insertText + updateParagraphStyle (HEADING_1/2/3)
  //   paragraph → insertText + updateParagraphStyle (NORMAL_TEXT)
  //   table → insertTable + insertTableRow + updateTableCellStyle
  //   list → insertText + createParagraphBullets
  //   bold/italic → updateTextStyle on range
  // Return array of batchUpdate requests in reverse-index order
}

export async function exportToGoogleDocs(opts: {
  content: string;
  docType: string;
  projectName: string;
  authClient: unknown;
  folderId?: string;
}): Promise<DocsExportResult> {
  const { google } = await import("googleapis");
  const docs = google.docs({ version: "v1", auth: opts.authClient });
  const drive = google.drive({ version: "v3", auth: opts.authClient });

  // 1. Create blank doc with title
  // 2. Build batchUpdate requests from markdown
  // 3. Execute batchUpdate (batch for efficiency)
  // 4. Move to folder
  // 5. Return URL + stats
}
```

**Note:** Google Docs API inserts text at index positions; requests must be built in reverse order (last content first) to maintain correct indices. This is the trickiest part of the implementation.

### Step 6: Update export.ts tool

Extend `EXPORT_FORMATS`:

```typescript
const EXPORT_FORMATS = ["xlsx", "pdf", "docx", "gsheet", "gdoc"] as const;
```

Add config_path to inputSchema:

```typescript
config_path: z.string().max(500).optional()
  .refine((p) => !p || /\.ya?ml$/i.test(p), { message: "config_path must be .yaml/.yml" })
  .describe("Path to sekkei.config.yaml (required for Google export to load credentials)"),
```

In `handleExportDocument`, add branch:

```typescript
if (format === "gsheet" || format === "gdoc") {
  // Load Google config from sekkei.config.yaml
  // Init auth client
  // Call appropriate exporter
  // Return result with Google Drive URL
}
```

### Step 7: Update CLI export command

In `src/cli/commands/export-cmd.ts`, ensure `--format` accepts `gsheet` and `gdoc`.

### Step 8: Write tests

Mock the `googleapis` module in tests — do not make real API calls.

`google-sheets-exporter.test.ts`:
- Test parseMarkdownTables with various markdown table formats
- Test spreadsheet creation call shape (mocked)
- Test header + data row formatting
- Test multi-table document → multiple sheets
- Test empty table handling

`google-docs-exporter.test.ts`:
- Test markdownToDocsRequests output shape
- Test heading conversion (H1/H2/H3)
- Test table conversion
- Test list conversion (bulleted, numbered)
- Test bold/italic text style requests
- Test reverse-index ordering correctness

## Todo List

- [ ] Install googleapis + google-auth-library dependencies
- [ ] Add GOOGLE_EXPORT_FAILED error code to errors.ts
- [ ] Add google config section to ProjectConfig in documents.ts
- [ ] Create `src/lib/google-auth.ts` — auth manager
- [ ] Create `src/lib/google-sheets-exporter.ts` — Sheets MVP
- [ ] Create `src/lib/google-docs-exporter.ts` — Docs export
- [ ] Update `src/tools/export.ts` — add gsheet/gdoc formats + config_path
- [ ] Update `src/cli/commands/export-cmd.ts` — support new formats
- [ ] Write `tests/unit/google-sheets-exporter.test.ts`
- [ ] Write `tests/unit/google-docs-exporter.test.ts`
- [ ] Run full test suite — verify 215+ tests still pass
- [ ] Run `npm run lint` — verify no type errors
- [ ] Manual test with real Google API (separate from CI)

## Success Criteria

1. `export_document` with `format=gsheet` creates Google Spreadsheet with correct data
2. `export_document` with `format=gdoc` creates formatted Google Doc
3. Service account auth works without user interaction
4. Google Drive file URL returned in export result
5. Without Google config, gsheet/gdoc export returns clear error message
6. Non-Google exports (xlsx, pdf, docx) unaffected (backward compat)
7. All new tests pass; existing 215 tests unaffected

## Risk Assessment

| Risk | Probability | Impact | Mitigation |
|------|------------|--------|------------|
| Google Docs table rendering poor | High | Medium | Sheets MVP first; Docs tables simplified (no merged cells) |
| Google API rate limits (100 req/100s) | Medium | Medium | Batch operations; retry with exponential backoff |
| googleapis package size (~40MB) | Medium | Low | Dynamic import; consider as optional peer dep |
| OAuth2 token refresh complexity | Medium | Low | Service account recommended; OAuth2 as advanced option |
| Reverse-index insertion ordering bugs | High | Medium | Thorough unit tests for markdownToDocsRequests; use marked AST |

## Security Considerations

- Google credentials file path validated: no `..` traversal
- Credentials never logged (pino redaction) or included in MCP tool output
- Service account key file permissions checked on load (warn if world-readable)
- OAuth2 tokens stored locally, never sent to MCP client
- Drive file permissions: default to private; user configures sharing separately
- Scopes limited to `drive.file` (only files created by app) + `spreadsheets` + `documents`

## Next Steps

- Google Sheets MVP first (1 day), then Google Docs (1 day)
- Template-based Sheets: allow company-specific Sheet templates (like Excel template filler)
- Batch export: export entire doc chain to a single Google Drive folder
- Webhook: auto-update Google Sheets when doc regenerated
- Consider google-docs-exporter.ts split if markdown→requests logic exceeds 200 lines
