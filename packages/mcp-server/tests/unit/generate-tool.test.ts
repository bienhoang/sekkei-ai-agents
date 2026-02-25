/**
 * Tests for generate_document tool — focused on the 3 simple generators
 * (project-plan, test-plan, migration-design) and shared pipeline features.
 *
 * These doc types share the core generation pipeline without split mode:
 *   generate_document → update_chain_status → validate_document
 */
import { describe, it, expect, beforeAll } from "@jest/globals";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import {
  registerGenerateDocumentTool,
  handleGenerateDocument,
  extractRevisionHistory,
  insertChangelogRow,
} from "../../src/tools/generate.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const TEMPLATE_DIR = resolve(__dirname, "../../templates");

/** Helper to call a tool on McpServer instance */
async function callTool(
  server: McpServer,
  name: string,
  args: Record<string, unknown>
): Promise<{ content: Array<{ type: string; text: string }>; isError?: boolean }> {
  return (server as any)._registeredTools[name].handler(args, {});
}

// ---------------------------------------------------------------------------
// 1. Core pipeline tests for the 3 simple generators
// ---------------------------------------------------------------------------

describe("generate_document: project-plan", () => {
  let server: McpServer;

  beforeAll(() => {
    server = new McpServer({ name: "test", version: "0.0.1" });
    registerGenerateDocumentTool(server, TEMPLATE_DIR);
  });

  it("returns generation context for project-plan", async () => {
    const result = await callTool(server, "generate_document", {
      doc_type: "project-plan",
      input_content: "要件定義書の内容を基にプロジェクト計画を作成",
      project_name: "EC Site Project",
      language: "ja",
    });

    const text = result.content[0].text;
    expect(result.isError).toBeUndefined();
    expect(text).toContain("Document Generation Context");
    expect(text).toContain("project-plan");
    expect(text).toContain("EC Site Project");
    expect(text).toContain("AI Instructions");
    expect(text).toContain("プロジェクト計画書");
    expect(text).toContain("WBS");
    expect(text).toContain("PP-001");
    expect(text).toContain("Template");
    expect(text).toContain("Input Content");
  });

  it("includes keigo instruction (default: teinei-go for project-plan)", async () => {
    const result = await callTool(server, "generate_document", {
      doc_type: "project-plan",
      input_content: "Test input",
      language: "ja",
    });

    const text = result.content[0].text;
    expect(text).toContain("ですます調");
  });

  it("includes output path suggestion", async () => {
    const result = await callTool(server, "generate_document", {
      doc_type: "project-plan",
      input_content: "Test input",
    });

    const text = result.content[0].text;
    expect(text).toContain("Output Path");
    expect(text).toContain("02-requirements/project-plan.md");
  });

  it("rejects split mode (scope param)", async () => {
    const result = await callTool(server, "generate_document", {
      doc_type: "project-plan",
      input_content: "Test input",
      scope: "shared",
    });

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain("not supported");
  });

  it("includes upstream IDs when upstream_content provided", async () => {
    const upstream = [
      "# Requirements",
      "REQ-001: User login",
      "REQ-002: Dashboard",
      "F-001: Login function",
    ].join("\n");

    const result = await callTool(server, "generate_document", {
      doc_type: "project-plan",
      input_content: "Build project plan from requirements",
      upstream_content: upstream,
    });

    const text = result.content[0].text;
    expect(text).toContain("Upstream Cross-Reference Checklist");
    expect(text).toContain("REQ-001");
    expect(text).toContain("REQ-002");
    expect(text).toContain("F-001");
    expect(text).toContain("verify all checkboxes");
  });
});

describe("generate_document: test-plan", () => {
  let server: McpServer;

  beforeAll(() => {
    server = new McpServer({ name: "test", version: "0.0.1" });
    registerGenerateDocumentTool(server, TEMPLATE_DIR);
  });

  it("returns generation context for test-plan", async () => {
    const result = await callTool(server, "generate_document", {
      doc_type: "test-plan",
      input_content: "要件定義書と基本設計書を基にテスト計画を作成",
      project_name: "Test Planning Project",
      language: "ja",
    });

    const text = result.content[0].text;
    expect(result.isError).toBeUndefined();
    expect(text).toContain("test-plan");
    expect(text).toContain("Test Planning Project");
    expect(text).toContain("テスト計画書");
    expect(text).toContain("TP-001");
    expect(text).toContain("テスト方針");
  });

  it("includes keigo instruction (default: simple for test-plan)", async () => {
    const result = await callTool(server, "generate_document", {
      doc_type: "test-plan",
      input_content: "Test input",
      language: "ja",
    });

    const text = result.content[0].text;
    expect(text).toContain("である調");
  });

  it("includes output path suggestion", async () => {
    const result = await callTool(server, "generate_document", {
      doc_type: "test-plan",
      input_content: "Test input",
    });

    const text = result.content[0].text;
    expect(text).toContain("Output Path");
    expect(text).toContain("08-test/test-plan.md");
  });

  it("rejects split mode", async () => {
    const result = await callTool(server, "generate_document", {
      doc_type: "test-plan",
      input_content: "Test input",
      scope: "feature",
      feature_name: "auth",
    });

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain("not supported");
  });
});

describe("generate_document: migration-design", () => {
  let server: McpServer;

  beforeAll(() => {
    server = new McpServer({ name: "test", version: "0.0.1" });
    registerGenerateDocumentTool(server, TEMPLATE_DIR);
  });

  it("returns generation context for migration-design", async () => {
    const result = await callTool(server, "generate_document", {
      doc_type: "migration-design",
      input_content: "既存システムからの移行計画を作成",
      project_name: "Migration Project",
      language: "ja",
    });

    const text = result.content[0].text;
    expect(result.isError).toBeUndefined();
    expect(text).toContain("migration-design");
    expect(text).toContain("Migration Project");
    expect(text).toContain("移行設計書");
    expect(text).toContain("MIG-001");
    expect(text).toContain("ロールバック");
  });

  it("includes keigo instruction (default: simple for migration-design)", async () => {
    const result = await callTool(server, "generate_document", {
      doc_type: "migration-design",
      input_content: "Test input",
      language: "ja",
    });

    const text = result.content[0].text;
    expect(text).toContain("である調");
  });

  it("includes output path suggestion", async () => {
    const result = await callTool(server, "generate_document", {
      doc_type: "migration-design",
      input_content: "Test input",
    });

    const text = result.content[0].text;
    expect(text).toContain("Output Path");
    expect(text).toContain("06-data/migration-design.md");
  });

  it("rejects split mode", async () => {
    const result = await callTool(server, "generate_document", {
      doc_type: "migration-design",
      input_content: "Test input",
      scope: "shared",
    });

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain("not supported");
  });
});

// ---------------------------------------------------------------------------
// 2. Shared pipeline features tested across all 3 doc types
// ---------------------------------------------------------------------------

describe("generate_document: keigo override", () => {
  let server: McpServer;

  beforeAll(() => {
    server = new McpServer({ name: "test", version: "0.0.1" });
    registerGenerateDocumentTool(server, TEMPLATE_DIR);
  });

  it("overrides default keigo for project-plan (teinei -> simple)", async () => {
    const result = await callTool(server, "generate_document", {
      doc_type: "project-plan",
      input_content: "Test input",
      keigo_override: "simple",
    });

    const text = result.content[0].text;
    // Check the Writing Style instruction block specifically
    // (template body may contain keigo references in AI comments)
    const styleBlock = text.split("## Writing Style")[1]?.split("##")[0] ?? "";
    expect(styleBlock).toContain("である調");
    expect(styleBlock).not.toContain("ですます調");
  });

  it("overrides default keigo for test-plan (simple -> teinei)", async () => {
    const result = await callTool(server, "generate_document", {
      doc_type: "test-plan",
      input_content: "Test input",
      keigo_override: "丁寧語",
    });

    const text = result.content[0].text;
    // The AI Instructions section should contain teinei-go style
    expect(text).toContain("ですます調");
    // The Writing Style block itself should NOT say "である調"
    // (but the template body may contain it in AI comments, so we check the instruction block)
    const styleBlock = text.split("## Writing Style")[1]?.split("##")[0] ?? "";
    expect(styleBlock).toContain("ですます調");
    expect(styleBlock).not.toContain("である調");
  });

  it("uses kenjo-go keigo when overridden", async () => {
    const result = await callTool(server, "generate_document", {
      doc_type: "migration-design",
      input_content: "Test input",
      keigo_override: "謙譲語",
    });

    const text = result.content[0].text;
    expect(text).toContain("謙譲語");
  });
});

describe("generate_document: confidence and traceability toggles", () => {
  let server: McpServer;

  beforeAll(() => {
    server = new McpServer({ name: "test", version: "0.0.1" });
    registerGenerateDocumentTool(server, TEMPLATE_DIR);
  });

  it("includes confidence annotations by default", async () => {
    const result = await callTool(server, "generate_document", {
      doc_type: "project-plan",
      input_content: "Test input",
    });

    expect(result.content[0].text).toContain("Confidence Annotations");
  });

  it("includes traceability annotations by default", async () => {
    const result = await callTool(server, "generate_document", {
      doc_type: "project-plan",
      input_content: "Test input",
    });

    expect(result.content[0].text).toContain("Source Traceability");
  });

  it("excludes confidence annotations when include_confidence=false", async () => {
    const result = await callTool(server, "generate_document", {
      doc_type: "test-plan",
      input_content: "Test input",
      include_confidence: false,
    });

    expect(result.content[0].text).not.toContain("Confidence Annotations");
  });

  it("excludes traceability annotations when include_traceability=false", async () => {
    const result = await callTool(server, "generate_document", {
      doc_type: "migration-design",
      input_content: "Test input",
      include_traceability: false,
    });

    expect(result.content[0].text).not.toContain("Source Traceability");
  });
});

describe("generate_document: ticket IDs", () => {
  let server: McpServer;

  beforeAll(() => {
    server = new McpServer({ name: "test", version: "0.0.1" });
    registerGenerateDocumentTool(server, TEMPLATE_DIR);
  });

  it("includes ticket references when ticket_ids provided", async () => {
    const result = await callTool(server, "generate_document", {
      doc_type: "project-plan",
      input_content: "Test input",
      ticket_ids: ["PROJ-123", "PROJ-456"],
    });

    const text = result.content[0].text;
    expect(text).toContain("Related Tickets");
    expect(text).toContain("PROJ-123");
    expect(text).toContain("PROJ-456");
  });

  it("omits ticket section when no ticket_ids", async () => {
    const result = await callTool(server, "generate_document", {
      doc_type: "test-plan",
      input_content: "Test input",
    });

    expect(result.content[0].text).not.toContain("Related Tickets");
  });
});

describe("generate_document: output language", () => {
  let server: McpServer;

  beforeAll(() => {
    server = new McpServer({ name: "test", version: "0.0.1" });
    registerGenerateDocumentTool(server, TEMPLATE_DIR);
  });

  it("includes Japanese output language instruction by default", async () => {
    const result = await callTool(server, "generate_document", {
      doc_type: "project-plan",
      input_content: "Test input",
      language: "ja",
    });

    const text = result.content[0].text;
    expect(text).toContain("Output Language");
    expect(text).toContain("Japanese (日本語)");
  });

  it("includes English output language instruction when language=en", async () => {
    const result = await callTool(server, "generate_document", {
      doc_type: "test-plan",
      input_content: "Test input",
      language: "en",
    });

    const text = result.content[0].text;
    expect(text).toContain("Output Language");
    expect(text).toContain("English");
    expect(text).toContain("Translate Japanese section headings");
  });

  it("includes Vietnamese output language instruction when language=vi", async () => {
    const result = await callTool(server, "generate_document", {
      doc_type: "migration-design",
      input_content: "Test input",
      language: "vi",
    });

    const text = result.content[0].text;
    expect(text).toContain("Vietnamese");
  });
});

describe("generate_document: bilingual input", () => {
  let server: McpServer;

  beforeAll(() => {
    server = new McpServer({ name: "test", version: "0.0.1" });
    registerGenerateDocumentTool(server, TEMPLATE_DIR);
  });

  it("includes bilingual instructions when input_lang is en", async () => {
    const result = await callTool(server, "generate_document", {
      doc_type: "project-plan",
      input_content: "Create a project plan for e-commerce system",
      input_lang: "en",
      language: "ja",
    });

    const text = result.content[0].text;
    expect(text).toContain("Input Language Instructions");
    expect(text).toContain("English");
  });

  it("omits bilingual instructions when input_lang is ja", async () => {
    const result = await callTool(server, "generate_document", {
      doc_type: "test-plan",
      input_content: "テスト計画を作成",
      input_lang: "ja",
      language: "ja",
    });

    expect(result.content[0].text).not.toContain("Input Language Instructions");
  });

  it("omits bilingual instructions when input_lang not provided", async () => {
    const result = await callTool(server, "generate_document", {
      doc_type: "migration-design",
      input_content: "移行計画を作成",
      language: "ja",
    });

    expect(result.content[0].text).not.toContain("Input Language Instructions");
  });
});

describe("generate_document: append mode", () => {
  let server: McpServer;

  beforeAll(() => {
    server = new McpServer({ name: "test", version: "0.0.1" });
    registerGenerateDocumentTool(server, TEMPLATE_DIR);
  });

  it("includes append mode instructions when enabled", async () => {
    const result = await callTool(server, "generate_document", {
      doc_type: "project-plan",
      input_content: "Additional requirements",
      append_mode: true,
    });

    const text = result.content[0].text;
    expect(text).toContain("Append Mode (MANDATORY)");
    expect(text).toContain("Preserve ALL existing requirements");
  });

  it("omits append mode when not set", async () => {
    const result = await callTool(server, "generate_document", {
      doc_type: "test-plan",
      input_content: "Test input",
    });

    expect(result.content[0].text).not.toContain("Append Mode");
  });
});

describe("generate_document: multiple input sources", () => {
  let server: McpServer;

  beforeAll(() => {
    server = new McpServer({ name: "test", version: "0.0.1" });
    registerGenerateDocumentTool(server, TEMPLATE_DIR);
  });

  it("includes input sources when provided", async () => {
    const result = await callTool(server, "generate_document", {
      doc_type: "project-plan",
      input_content: "Combined sources",
      input_sources: [
        { name: "Business Team", content: "Business requirements" },
        { name: "Tech Team", content: "Technical constraints" },
      ],
    });

    const text = result.content[0].text;
    expect(text).toContain("Multiple Input Sources");
    expect(text).toContain("Business Team");
    expect(text).toContain("Tech Team");
    expect(text).toContain("出典");
  });
});

describe("generate_document: existing content preservation", () => {
  let server: McpServer;

  beforeAll(() => {
    server = new McpServer({ name: "test", version: "0.0.1" });
    registerGenerateDocumentTool(server, TEMPLATE_DIR);
  });

  it("includes changelog preservation when existing_content has revision history", async () => {
    const existingContent = [
      "# プロジェクト計画書",
      "## 改訂履歴",
      "| 版数 | 日付 | 変更内容 | 変更者 |",
      "|------|------|----------|--------|",
      "| v1.0 | 2026-01-01 | 初版作成 | 田中 |",
      "## 概要",
      "Some content",
    ].join("\n");

    const result = await callTool(server, "generate_document", {
      doc_type: "project-plan",
      input_content: "Updated requirements",
      existing_content: existingContent,
    });

    const text = result.content[0].text;
    expect(text).toContain("Changelog Preservation (MANDATORY)");
    expect(text).toContain("v1.0");
    expect(text).toContain("初版作成");
  });
});

describe("generate_document: defaults for optional params", () => {
  let server: McpServer;

  beforeAll(() => {
    server = new McpServer({ name: "test", version: "0.0.1" });
    registerGenerateDocumentTool(server, TEMPLATE_DIR);
  });

  it("uses 'Unnamed Project' when project_name not provided", async () => {
    const result = await callTool(server, "generate_document", {
      doc_type: "project-plan",
      input_content: "Test input",
    });

    expect(result.content[0].text).toContain("Unnamed Project");
  });

  it("displays language from input (Zod default applies at MCP layer)", async () => {
    // When called via MCP server, Zod applies default "ja".
    // When language is explicitly provided, it appears in context.
    const result = await callTool(server, "generate_document", {
      doc_type: "test-plan",
      input_content: "Test input",
      language: "ja",
    });

    const text = result.content[0].text;
    expect(text).toContain("**Language:** ja");
  });
});

// ---------------------------------------------------------------------------
// 3. handleGenerateDocument direct tests (bypassing MCP server)
// ---------------------------------------------------------------------------

describe("handleGenerateDocument: direct handler tests", () => {
  it("generates project-plan context directly", async () => {
    const result = await handleGenerateDocument({
      doc_type: "project-plan",
      input_content: "Test direct handler for project-plan",
      project_name: "Direct Test",
      language: "ja",
      templateDir: TEMPLATE_DIR,
    });

    expect(result.isError).toBeUndefined();
    expect(result.content[0].text).toContain("project-plan");
    expect(result.content[0].text).toContain("Direct Test");
  });

  it("generates test-plan context directly", async () => {
    const result = await handleGenerateDocument({
      doc_type: "test-plan",
      input_content: "Test direct handler for test-plan",
      language: "ja",
      templateDir: TEMPLATE_DIR,
    });

    expect(result.isError).toBeUndefined();
    expect(result.content[0].text).toContain("test-plan");
  });

  it("generates migration-design context directly", async () => {
    const result = await handleGenerateDocument({
      doc_type: "migration-design",
      input_content: "Test direct handler for migration-design",
      language: "ja",
      templateDir: TEMPLATE_DIR,
    });

    expect(result.isError).toBeUndefined();
    expect(result.content[0].text).toContain("migration-design");
  });

  it("returns error for invalid template directory", async () => {
    const result = await handleGenerateDocument({
      doc_type: "project-plan",
      input_content: "Test",
      templateDir: "/nonexistent/templates",
    });

    expect(result.isError).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// 4. extractRevisionHistory unit tests
// ---------------------------------------------------------------------------

describe("extractRevisionHistory", () => {
  it("extracts revision history section", () => {
    const content = [
      "# Document",
      "## 改訂履歴",
      "| 版数 | 日付 | 変更内容 | 変更者 |",
      "|------|------|----------|--------|",
      "| v1.0 | 2026-01-01 | 初版作成 | 田中 |",
      "| v1.1 | 2026-02-01 | 修正 | 鈴木 |",
      "## 概要",
      "Content here",
    ].join("\n");

    const result = extractRevisionHistory(content);
    expect(result).toContain("改訂履歴");
    expect(result).toContain("v1.0");
    expect(result).toContain("v1.1");
    expect(result).not.toContain("概要");
  });

  it("returns empty string when no revision history section", () => {
    const content = "# Document\n## 概要\nSome content";
    expect(extractRevisionHistory(content)).toBe("");
  });

  it("handles nested heading level (### 改訂履歴)", () => {
    const content = [
      "# Document",
      "### 改訂履歴",
      "| 版数 | 日付 |",
      "| v1.0 | 2026-01-01 |",
      "### Next Section",
    ].join("\n");

    const result = extractRevisionHistory(content);
    expect(result).toContain("改訂履歴");
    expect(result).toContain("v1.0");
    expect(result).not.toContain("Next Section");
  });

  it("captures until end of file when no next heading", () => {
    const content = [
      "# Document",
      "## 改訂履歴",
      "| 版数 | 日付 |",
      "| v1.0 | 2026-01-01 |",
    ].join("\n");

    const result = extractRevisionHistory(content);
    expect(result).toContain("v1.0");
  });
});

// ---------------------------------------------------------------------------
// 5. insertChangelogRow unit tests
// ---------------------------------------------------------------------------

describe("insertChangelogRow", () => {
  it("inserts a row after the last data row in revision history", () => {
    const content = [
      "## 改訂履歴",
      "| 版数 | 日付 | 変更内容 | 変更者 |",
      "|------|------|----------|--------|",
      "| v1.0 | 2026-01-01 | 初版作成 | 田中 |",
      "## 概要",
    ].join("\n");

    const result = insertChangelogRow(content, "| v1.1 | 2026-02-01 | 更新 | 鈴木 |");
    const lines = result.split("\n");
    const idx = lines.findIndex(l => l.includes("v1.1"));
    expect(idx).toBeGreaterThan(0);
    // New row is after v1.0 and before ## 概要
    expect(lines[idx - 1]).toContain("v1.0");
    expect(lines[idx + 1]).toContain("概要");
  });

  it("returns content unchanged when no revision history table found", () => {
    const content = "# Document\n## 概要\nSome content";
    const result = insertChangelogRow(content, "| v1.0 | 2026-01-01 | New | |");
    expect(result).toBe(content);
  });

  it("inserts after the LAST data row when multiple rows exist", () => {
    const content = [
      "## 改訂履歴",
      "| 版数 | 日付 | 変更内容 | 変更者 |",
      "|------|------|----------|--------|",
      "| v1.0 | 2026-01-01 | 初版 | 田中 |",
      "| v1.1 | 2026-02-01 | 修正 | 鈴木 |",
      "## 概要",
    ].join("\n");

    const result = insertChangelogRow(content, "| v1.2 | 2026-03-01 | 追加 | 佐藤 |");
    const lines = result.split("\n");
    const idx = lines.findIndex(l => l.includes("v1.2"));
    expect(lines[idx - 1]).toContain("v1.1"); // After last existing row
  });
});

// ---------------------------------------------------------------------------
// 6. source_code_path restriction test
// ---------------------------------------------------------------------------

describe("generate_document: source_code_path restriction", () => {
  let server: McpServer;

  beforeAll(() => {
    server = new McpServer({ name: "test", version: "0.0.1" });
    registerGenerateDocumentTool(server, TEMPLATE_DIR);
  });

  it("ignores source_code_path for project-plan (only detail-design/ut-spec use it)", async () => {
    const result = await callTool(server, "generate_document", {
      doc_type: "project-plan",
      input_content: "Test input",
      source_code_path: "/some/code/path",
    });

    // Should succeed without code analysis block
    expect(result.isError).toBeUndefined();
    // Code context is only added for detail-design and ut-spec
    expect(result.content[0].text).not.toContain("Code Analysis");
  });

  it("ignores source_code_path for test-plan", async () => {
    const result = await callTool(server, "generate_document", {
      doc_type: "test-plan",
      input_content: "Test input",
      source_code_path: "/some/code/path",
    });

    expect(result.isError).toBeUndefined();
  });

  it("ignores source_code_path for migration-design", async () => {
    const result = await callTool(server, "generate_document", {
      doc_type: "migration-design",
      input_content: "Test input",
      source_code_path: "/some/code/path",
    });

    expect(result.isError).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// 7. project_type instructions
// ---------------------------------------------------------------------------

describe("generate_document: project_type instructions for supported doc types", () => {
  let server: McpServer;

  beforeAll(() => {
    server = new McpServer({ name: "test", version: "0.0.1" });
    registerGenerateDocumentTool(server, TEMPLATE_DIR);
  });

  // All 12 project types with instructions should include their project-type block
  // for basic-design (all 12 have basic-design entries)
  const typesWithInstructions = [
    "saas", "internal-system", "mobile", "batch", "lp", "government",
    "finance", "healthcare", "microservice", "hybrid", "event-driven", "ai-ml",
  ];

  for (const projectType of typesWithInstructions) {
    it(`includes project-type instructions for basic-design + ${projectType}`, async () => {
      const result = await callTool(server, "generate_document", {
        doc_type: "basic-design",
        input_content: "Test input",
        project_type: projectType,
      });
      expect(result.isError).toBeUndefined();
      expect(result.content[0].text).toContain("Project Type:");
    });
  }

  // Verify the 11 previously-missing combos now return instructions
  const newCombos: [string, string][] = [
    ["internal-system", "detail-design"],
    ["mobile", "requirements"],
    ["batch", "requirements"],
    ["lp", "requirements"],
    ["lp", "detail-design"],
    ["lp", "security-design"],
    ["hybrid", "detail-design"],
    ["hybrid", "requirements"],
    ["hybrid", "security-design"],
    ["event-driven", "security-design"],
    ["ai-ml", "security-design"],
  ];

  for (const [projectType, docType] of newCombos) {
    it(`includes instructions for ${docType} + ${projectType}`, async () => {
      const result = await callTool(server, "generate_document", {
        doc_type: docType,
        input_content: "Test input",
        project_type: projectType,
      });
      expect(result.isError).toBeUndefined();
      expect(result.content[0].text).toContain("Project Type:");
    });
  }
});

describe("generate_document: project_type has no effect on simple generators", () => {
  let server: McpServer;

  beforeAll(() => {
    server = new McpServer({ name: "test", version: "0.0.1" });
    registerGenerateDocumentTool(server, TEMPLATE_DIR);
  });

  it("project-plan has no project_type-specific instructions (not in PROJECT_TYPE_INSTRUCTIONS)", async () => {
    const result = await callTool(server, "generate_document", {
      doc_type: "project-plan",
      input_content: "Test input",
      project_type: "saas",
    });

    // project-plan is NOT a key in PROJECT_TYPE_INSTRUCTIONS for saas,
    // so no project_type block should be injected (other than the empty string)
    expect(result.isError).toBeUndefined();
    // Verify the core instructions are still present
    expect(result.content[0].text).toContain("プロジェクト計画書");
  });

  it("test-plan has no project_type-specific instructions", async () => {
    const result = await callTool(server, "generate_document", {
      doc_type: "test-plan",
      input_content: "Test input",
      project_type: "mobile",
    });

    expect(result.isError).toBeUndefined();
    expect(result.content[0].text).toContain("テスト計画書");
    // No mobile-specific test-plan instructions exist
    expect(result.content[0].text).not.toContain("Project Type: Mobile");
  });

  it("migration-design has no project_type-specific instructions", async () => {
    const result = await callTool(server, "generate_document", {
      doc_type: "migration-design",
      input_content: "Test input",
      project_type: "government",
    });

    expect(result.isError).toBeUndefined();
    expect(result.content[0].text).toContain("移行設計書");
    expect(result.content[0].text).not.toContain("Project Type: Government");
  });
});

// ---------------------------------------------------------------------------
// 8. template_mode: skeleton
// ---------------------------------------------------------------------------

describe("generate_document: template_mode skeleton", () => {
  it("skeleton mode injects only heading lines from template", async () => {
    const result = await handleGenerateDocument({
      doc_type: "project-plan",
      input_content: "Test skeleton mode",
      language: "ja",
      template_mode: "skeleton",
      templateDir: TEMPLATE_DIR,
    });

    expect(result.isError).toBeUndefined();
    const text = result.content[0].text;
    // Should contain the skeleton header
    expect(text).toContain("## Template (skeleton)");
    // Skeleton lines must all start with # headings
    const skeletonBlock = text.split("## Template (skeleton)")[1]?.split("## Input Content")[0] ?? "";
    const nonHeadingContentLines = skeletonBlock.split("\n")
      .filter(l => l.trim().length > 0 && !/^#{1,4}\s/.test(l));
    expect(nonHeadingContentLines.length).toBe(0);
  });

  it("full mode (default) injects complete template content", async () => {
    const result = await handleGenerateDocument({
      doc_type: "project-plan",
      input_content: "Test full mode",
      language: "ja",
      template_mode: "full",
      templateDir: TEMPLATE_DIR,
    });

    expect(result.isError).toBeUndefined();
    const text = result.content[0].text;
    expect(text).toContain("## Template\n");
    expect(text).not.toContain("## Template (skeleton)");
  });
});
