/**
 * Tests for test spec generators (ut-spec, it-spec, st-spec, uat-spec).
 *
 * Sub-batch A (system-level only, no split mode): st-spec, uat-spec
 * Sub-batch B (split mode capable): ut-spec, it-spec
 *
 * Coverage: generation instructions, keigo, output paths, split mode,
 * upstream ID cross-references, source_code_path restrictions, plan detect.
 */
import { describe, it, expect, beforeAll, afterAll } from "@jest/globals";
import { resolve, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { mkdtemp, rm, mkdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import {
  registerGenerateDocumentTool,
  handleGenerateDocument,
} from "../../src/tools/generate.js";
import { handlePlan } from "../../src/tools/plan.js";
import type { PlanArgs } from "../../src/tools/plan.js";

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

/** Helper for plan tool calls */
async function callPlan(args: PlanArgs) {
  return handlePlan(args);
}

function parseResult(result: { content: Array<{ type: string; text: string }>; isError?: boolean }) {
  return JSON.parse(result.content[0].text);
}

// ============================================================================
// Sub-batch A: st-spec and uat-spec (system-level, no split mode)
// ============================================================================

describe("generate_document: st-spec", () => {
  let server: McpServer;

  beforeAll(() => {
    server = new McpServer({ name: "test", version: "0.0.1" });
    registerGenerateDocumentTool(server, TEMPLATE_DIR);
  });

  it("returns generation context for st-spec", async () => {
    const result = await callTool(server, "generate_document", {
      doc_type: "st-spec",
      input_content: "基本設計書と機能一覧からシステムテスト仕様書を作成",
      project_name: "EC Site Project",
      language: "ja",
    });

    const text = result.content[0].text;
    expect(result.isError).toBeUndefined();
    expect(text).toContain("Document Generation Context");
    expect(text).toContain("st-spec");
    expect(text).toContain("EC Site Project");
    expect(text).toContain("AI Instructions");
    expect(text).toContain("システムテスト仕様書");
    expect(text).toContain("ST-001");
    expect(text).toContain("Template");
    expect(text).toContain("Input Content");
  });

  it("includes correct upstream cross-reference ID types", async () => {
    const result = await callTool(server, "generate_document", {
      doc_type: "st-spec",
      input_content: "Generate system test spec",
      language: "ja",
    });

    const text = result.content[0].text;
    // st-spec references SCR-xxx, TBL-xxx, F-xxx from basic-design + functions-list
    expect(text).toContain("SCR-xxx");
    expect(text).toContain("TBL-xxx");
    expect(text).toContain("F-xxx");
    // Traceability pattern
    expect(text).toContain("F-xxx → SCR-xxx → ST-xxx");
  });

  it("includes correct test perspectives", async () => {
    const result = await callTool(server, "generate_document", {
      doc_type: "st-spec",
      input_content: "Test input",
      language: "ja",
    });

    const text = result.content[0].text;
    expect(text).toContain("パフォーマンス");
    expect(text).toContain("セキュリティ");
    expect(text).toContain("E2E");
  });

  it("uses default keigo: simple (である調)", async () => {
    const result = await callTool(server, "generate_document", {
      doc_type: "st-spec",
      input_content: "Test input",
      language: "ja",
    });

    const text = result.content[0].text;
    expect(text).toContain("である調");
  });

  it("includes output path suggestion under 08-test/", async () => {
    const result = await callTool(server, "generate_document", {
      doc_type: "st-spec",
      input_content: "Test input",
    });

    const text = result.content[0].text;
    expect(text).toContain("Output Path");
    expect(text).toContain("08-test/st-spec.md");
  });

  it("rejects split mode (scope param)", async () => {
    const result = await callTool(server, "generate_document", {
      doc_type: "st-spec",
      input_content: "Test input",
      scope: "shared",
    });

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain("not supported");
  });

  it("rejects feature scope too", async () => {
    const result = await callTool(server, "generate_document", {
      doc_type: "st-spec",
      input_content: "Test input",
      scope: "feature",
      feature_name: "sales-management",
    });

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain("not supported");
  });

  it("includes upstream IDs when upstream_content provided", async () => {
    const upstream = [
      "# Basic Design",
      "SCR-001: Login screen",
      "TBL-001: Users table",
      "F-001: User authentication",
      "API-001: Login endpoint",
    ].join("\n");

    const result = await callTool(server, "generate_document", {
      doc_type: "st-spec",
      input_content: "Generate system test spec from basic design",
      upstream_content: upstream,
    });

    const text = result.content[0].text;
    expect(text).toContain("Upstream Cross-Reference Checklist");
    expect(text).toContain("SCR-001");
    expect(text).toContain("TBL-001");
    expect(text).toContain("F-001");
    expect(text).toContain("API-001");
    expect(text).toContain("verify all checkboxes");
  });

  it("ignores source_code_path (only detail-design and ut-spec use it)", async () => {
    const result = await callTool(server, "generate_document", {
      doc_type: "st-spec",
      input_content: "Test input",
      source_code_path: "/some/code/path",
    });

    expect(result.isError).toBeUndefined();
    expect(result.content[0].text).not.toContain("Code Analysis");
  });
});

describe("generate_document: uat-spec", () => {
  let server: McpServer;

  beforeAll(() => {
    server = new McpServer({ name: "test", version: "0.0.1" });
    registerGenerateDocumentTool(server, TEMPLATE_DIR);
  });

  it("returns generation context for uat-spec", async () => {
    const result = await callTool(server, "generate_document", {
      doc_type: "uat-spec",
      input_content: "要件定義書と非機能要件から受入テスト仕様書を作成",
      project_name: "Acceptance Test Project",
      language: "ja",
    });

    const text = result.content[0].text;
    expect(result.isError).toBeUndefined();
    expect(text).toContain("uat-spec");
    expect(text).toContain("Acceptance Test Project");
    expect(text).toContain("受入テスト仕様書");
    expect(text).toContain("UAT-001");
    expect(text).toContain("Template");
    expect(text).toContain("Input Content");
  });

  it("includes correct upstream cross-reference ID types", async () => {
    const result = await callTool(server, "generate_document", {
      doc_type: "uat-spec",
      input_content: "Generate acceptance test spec",
      language: "ja",
    });

    const text = result.content[0].text;
    // uat-spec references REQ-xxx, NFR-xxx from requirements + nfr
    expect(text).toContain("REQ-xxx");
    expect(text).toContain("NFR-xxx");
    // Traceability pattern
    expect(text).toContain("REQ-xxx → NFR-xxx → UAT-xxx");
  });

  it("is business scenario-based", async () => {
    const result = await callTool(server, "generate_document", {
      doc_type: "uat-spec",
      input_content: "Test input",
      language: "ja",
    });

    const text = result.content[0].text;
    expect(text).toContain("Business scenario");
  });

  it("uses default keigo: simple (である調)", async () => {
    const result = await callTool(server, "generate_document", {
      doc_type: "uat-spec",
      input_content: "Test input",
      language: "ja",
    });

    const text = result.content[0].text;
    expect(text).toContain("である調");
  });

  it("includes output path suggestion under 08-test/", async () => {
    const result = await callTool(server, "generate_document", {
      doc_type: "uat-spec",
      input_content: "Test input",
    });

    const text = result.content[0].text;
    expect(text).toContain("Output Path");
    expect(text).toContain("08-test/uat-spec.md");
  });

  it("rejects split mode", async () => {
    const result = await callTool(server, "generate_document", {
      doc_type: "uat-spec",
      input_content: "Test input",
      scope: "shared",
    });

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain("not supported");
  });

  it("includes upstream IDs when upstream_content provided", async () => {
    const upstream = [
      "# Requirements",
      "REQ-001: User can place orders",
      "REQ-002: Admin can manage inventory",
      "NFR-001: Response time < 3 seconds",
      "NFR-002: 99.9% availability",
    ].join("\n");

    const result = await callTool(server, "generate_document", {
      doc_type: "uat-spec",
      input_content: "Generate acceptance test from requirements",
      upstream_content: upstream,
    });

    const text = result.content[0].text;
    expect(text).toContain("Upstream Cross-Reference Checklist");
    expect(text).toContain("REQ-001");
    expect(text).toContain("REQ-002");
    expect(text).toContain("NFR-001");
    expect(text).toContain("NFR-002");
  });

  it("ignores source_code_path", async () => {
    const result = await callTool(server, "generate_document", {
      doc_type: "uat-spec",
      input_content: "Test input",
      source_code_path: "/some/code/path",
    });

    expect(result.isError).toBeUndefined();
    expect(result.content[0].text).not.toContain("Code Analysis");
  });

  it("includes acceptance criteria verification instruction", async () => {
    const result = await callTool(server, "generate_document", {
      doc_type: "uat-spec",
      input_content: "Test input",
      language: "ja",
    });

    const text = result.content[0].text;
    expect(text).toContain("acceptance criteria");
  });
});

// ============================================================================
// Sub-batch B: ut-spec and it-spec (split mode capable)
// ============================================================================

describe("generate_document: ut-spec", () => {
  let server: McpServer;

  beforeAll(() => {
    server = new McpServer({ name: "test", version: "0.0.1" });
    registerGenerateDocumentTool(server, TEMPLATE_DIR);
  });

  it("returns generation context for ut-spec", async () => {
    const result = await callTool(server, "generate_document", {
      doc_type: "ut-spec",
      input_content: "詳細設計書から単体テスト仕様書を作成",
      project_name: "UT Spec Project",
      language: "ja",
    });

    const text = result.content[0].text;
    expect(result.isError).toBeUndefined();
    expect(text).toContain("ut-spec");
    expect(text).toContain("UT Spec Project");
    expect(text).toContain("単体テスト仕様書");
    expect(text).toContain("UT-001");
    expect(text).toContain("Template");
    expect(text).toContain("Input Content");
  });

  it("includes correct upstream cross-reference ID types", async () => {
    const result = await callTool(server, "generate_document", {
      doc_type: "ut-spec",
      input_content: "Generate unit test spec",
      language: "ja",
    });

    const text = result.content[0].text;
    // ut-spec references CLS-xxx, DD-xxx from detail-design
    expect(text).toContain("CLS-xxx");
    expect(text).toContain("DD-xxx");
    // Traceability pattern
    expect(text).toContain("DD-xxx → CLS-xxx → UT-xxx");
  });

  it("includes test perspective requirements", async () => {
    const result = await callTool(server, "generate_document", {
      doc_type: "ut-spec",
      input_content: "Test input",
      language: "ja",
    });

    const text = result.content[0].text;
    expect(text).toContain("正常系");
    expect(text).toContain("異常系");
    expect(text).toContain("境界値");
  });

  it("uses default keigo: simple (である調)", async () => {
    const result = await callTool(server, "generate_document", {
      doc_type: "ut-spec",
      input_content: "Test input",
      language: "ja",
    });

    const text = result.content[0].text;
    expect(text).toContain("である調");
  });

  it("includes default output path under 08-test/", async () => {
    const result = await callTool(server, "generate_document", {
      doc_type: "ut-spec",
      input_content: "Test input",
    });

    const text = result.content[0].text;
    expect(text).toContain("Output Path");
    expect(text).toContain("08-test/ut-spec.md");
  });

  it("supports split mode: shared scope", async () => {
    const result = await callTool(server, "generate_document", {
      doc_type: "ut-spec",
      input_content: "Generate shared sections for unit tests",
      scope: "shared",
    });

    expect(result.isError).toBeUndefined();
    const text = result.content[0].text;
    expect(text).toContain("Split Mode: Shared Sections");
    expect(text).toContain("03-system/");
  });

  it("supports split mode: feature scope with feature-scoped IDs", async () => {
    const result = await callTool(server, "generate_document", {
      doc_type: "ut-spec",
      input_content: "Generate unit tests for sales module",
      scope: "feature",
      feature_name: "sales-management",
    });

    expect(result.isError).toBeUndefined();
    const text = result.content[0].text;
    expect(text).toContain("Split Mode: Feature");
    expect(text).toContain("sales-management");
    // Feature-scoped IDs use prefix derived from feature name
    expect(text).toContain("Feature-Scoped ID Rules");
    expect(text).toContain("SM"); // prefix from "sales-management" -> S + M
  });

  it("includes feature-scoped output path when in feature scope", async () => {
    const result = await callTool(server, "generate_document", {
      doc_type: "ut-spec",
      input_content: "Test input",
      scope: "feature",
      feature_name: "sales-management",
    });

    const text = result.content[0].text;
    expect(text).toContain("05-features/sales-management/ut-spec.md");
  });

  it("allows source_code_path for code-aware generation", async () => {
    // ut-spec is one of the doc types that supports source_code_path
    // (the code analysis will fail on nonexistent path but should not error out —
    //  it gracefully skips code analysis)
    const result = await callTool(server, "generate_document", {
      doc_type: "ut-spec",
      input_content: "Test input",
      source_code_path: "/nonexistent/path",
    });

    // Should succeed — code analysis failure is non-blocking
    expect(result.isError).toBeUndefined();
  });

  it("includes upstream IDs when upstream_content provided", async () => {
    const upstream = [
      "# Detail Design",
      "CLS-001: UserService",
      "CLS-002: OrderRepository",
      "DD-001: Module design for user management",
    ].join("\n");

    const result = await callTool(server, "generate_document", {
      doc_type: "ut-spec",
      input_content: "Generate unit tests from detail design",
      upstream_content: upstream,
    });

    const text = result.content[0].text;
    expect(text).toContain("Upstream Cross-Reference Checklist");
    expect(text).toContain("CLS-001");
    expect(text).toContain("CLS-002");
    expect(text).toContain("DD-001");
  });

  it("requires minimum 5 cases per major module", async () => {
    const result = await callTool(server, "generate_document", {
      doc_type: "ut-spec",
      input_content: "Test input",
      language: "ja",
    });

    const text = result.content[0].text;
    expect(text).toContain("5 cases per major module");
  });
});

describe("generate_document: it-spec", () => {
  let server: McpServer;

  beforeAll(() => {
    server = new McpServer({ name: "test", version: "0.0.1" });
    registerGenerateDocumentTool(server, TEMPLATE_DIR);
  });

  it("returns generation context for it-spec", async () => {
    const result = await callTool(server, "generate_document", {
      doc_type: "it-spec",
      input_content: "基本設計書から結合テスト仕様書を作成",
      project_name: "IT Spec Project",
      language: "ja",
    });

    const text = result.content[0].text;
    expect(result.isError).toBeUndefined();
    expect(text).toContain("it-spec");
    expect(text).toContain("IT Spec Project");
    expect(text).toContain("結合テスト仕様書");
    expect(text).toContain("IT-001");
    expect(text).toContain("Template");
    expect(text).toContain("Input Content");
  });

  it("includes correct upstream cross-reference ID types", async () => {
    const result = await callTool(server, "generate_document", {
      doc_type: "it-spec",
      input_content: "Generate integration test spec",
      language: "ja",
    });

    const text = result.content[0].text;
    // it-spec references API-xxx, SCR-xxx, TBL-xxx from basic-design
    expect(text).toContain("API-xxx");
    expect(text).toContain("SCR-xxx");
    expect(text).toContain("TBL-xxx");
    // Traceability pattern
    expect(text).toContain("API-xxx → SCR-xxx → IT-xxx");
  });

  it("focuses on integration-level testing", async () => {
    const result = await callTool(server, "generate_document", {
      doc_type: "it-spec",
      input_content: "Test input",
      language: "ja",
    });

    const text = result.content[0].text;
    expect(text).toContain("API integration");
    expect(text).toContain("screen transition");
    expect(text).toContain("data flow");
  });

  it("uses default keigo: simple (である調)", async () => {
    const result = await callTool(server, "generate_document", {
      doc_type: "it-spec",
      input_content: "Test input",
      language: "ja",
    });

    const text = result.content[0].text;
    expect(text).toContain("である調");
  });

  it("includes default output path under 08-test/", async () => {
    const result = await callTool(server, "generate_document", {
      doc_type: "it-spec",
      input_content: "Test input",
    });

    const text = result.content[0].text;
    expect(text).toContain("Output Path");
    expect(text).toContain("08-test/it-spec.md");
  });

  it("supports split mode: shared scope", async () => {
    const result = await callTool(server, "generate_document", {
      doc_type: "it-spec",
      input_content: "Generate shared integration test sections",
      scope: "shared",
    });

    expect(result.isError).toBeUndefined();
    const text = result.content[0].text;
    expect(text).toContain("Split Mode: Shared Sections");
  });

  it("supports split mode: feature scope with feature-scoped IDs", async () => {
    const result = await callTool(server, "generate_document", {
      doc_type: "it-spec",
      input_content: "Generate integration tests for inventory module",
      scope: "feature",
      feature_name: "inventory-management",
    });

    expect(result.isError).toBeUndefined();
    const text = result.content[0].text;
    expect(text).toContain("Split Mode: Feature");
    expect(text).toContain("inventory-management");
    expect(text).toContain("Feature-Scoped ID Rules");
    expect(text).toContain("IM"); // prefix from "inventory-management" -> I + M
  });

  it("includes feature-scoped output path when in feature scope", async () => {
    const result = await callTool(server, "generate_document", {
      doc_type: "it-spec",
      input_content: "Test input",
      scope: "feature",
      feature_name: "inventory-management",
    });

    const text = result.content[0].text;
    expect(text).toContain("05-features/inventory-management/it-spec.md");
  });

  it("ignores source_code_path (only detail-design and ut-spec use it)", async () => {
    const result = await callTool(server, "generate_document", {
      doc_type: "it-spec",
      input_content: "Test input",
      source_code_path: "/some/code/path",
    });

    expect(result.isError).toBeUndefined();
    expect(result.content[0].text).not.toContain("Code Analysis");
  });

  it("includes upstream IDs when upstream_content provided", async () => {
    const upstream = [
      "# Basic Design",
      "API-001: User authentication endpoint",
      "API-002: Order creation endpoint",
      "SCR-001: Login screen",
      "TBL-001: Users table",
    ].join("\n");

    const result = await callTool(server, "generate_document", {
      doc_type: "it-spec",
      input_content: "Generate integration tests from basic design",
      upstream_content: upstream,
    });

    const text = result.content[0].text;
    expect(text).toContain("Upstream Cross-Reference Checklist");
    expect(text).toContain("API-001");
    expect(text).toContain("API-002");
    expect(text).toContain("SCR-001");
    expect(text).toContain("TBL-001");
  });

  it("requires at least 5 integration test cases", async () => {
    const result = await callTool(server, "generate_document", {
      doc_type: "it-spec",
      input_content: "Test input",
      language: "ja",
    });

    const text = result.content[0].text;
    expect(text).toContain("5 integration test cases");
  });
});

// ============================================================================
// Shared pipeline features across all 4 test spec types
// ============================================================================

describe("test spec: shared pipeline features", () => {
  let server: McpServer;

  beforeAll(() => {
    server = new McpServer({ name: "test", version: "0.0.1" });
    registerGenerateDocumentTool(server, TEMPLATE_DIR);
  });

  it("all 4 test specs include 12-column table instruction", async () => {
    const docTypes = ["ut-spec", "it-spec", "st-spec", "uat-spec"] as const;

    for (const docType of docTypes) {
      const result = await callTool(server, "generate_document", {
        doc_type: docType,
        input_content: "Test input",
        language: "ja",
      });

      const text = result.content[0].text;
      expect(text).toContain("12-column table");
    }
  });

  it("all 4 test specs include common sections", async () => {
    const docTypes = ["ut-spec", "it-spec", "st-spec", "uat-spec"] as const;
    const commonSections = ["テスト設計", "トレーサビリティ", "デフェクト報告"];

    for (const docType of docTypes) {
      const result = await callTool(server, "generate_document", {
        doc_type: docType,
        input_content: "Test input",
        language: "ja",
      });

      const text = result.content[0].text;
      for (const section of commonSections) {
        expect(text).toContain(section);
      }
    }
  });

  it("all 4 test specs include confidence and traceability annotations by default", async () => {
    const docTypes = ["ut-spec", "it-spec", "st-spec", "uat-spec"] as const;

    for (const docType of docTypes) {
      const result = await callTool(server, "generate_document", {
        doc_type: docType,
        input_content: "Test input",
      });

      const text = result.content[0].text;
      expect(text).toContain("Confidence Annotations");
      expect(text).toContain("Source Traceability");
    }
  });

  it("keigo override works for test specs", async () => {
    const result = await callTool(server, "generate_document", {
      doc_type: "st-spec",
      input_content: "Test input",
      keigo_override: "丁寧語",
    });

    const text = result.content[0].text;
    expect(text).toContain("ですます調");
  });

  it("ticket IDs included for test specs", async () => {
    const result = await callTool(server, "generate_document", {
      doc_type: "uat-spec",
      input_content: "Test input",
      ticket_ids: ["UAT-TICKET-001"],
    });

    const text = result.content[0].text;
    expect(text).toContain("Related Tickets");
    expect(text).toContain("UAT-TICKET-001");
  });

  it("English output language works for test specs", async () => {
    const result = await callTool(server, "generate_document", {
      doc_type: "ut-spec",
      input_content: "Test input",
      language: "en",
    });

    const text = result.content[0].text;
    expect(text).toContain("Output Language");
    expect(text).toContain("English");
    expect(text).toContain("Translate Japanese section headings");
  });
});

// ============================================================================
// handleGenerateDocument direct handler tests for test specs
// ============================================================================

describe("handleGenerateDocument: test spec direct handler", () => {
  it("generates ut-spec context directly", async () => {
    const result = await handleGenerateDocument({
      doc_type: "ut-spec",
      input_content: "Direct handler test for ut-spec",
      language: "ja",
      templateDir: TEMPLATE_DIR,
    });

    expect(result.isError).toBeUndefined();
    expect(result.content[0].text).toContain("ut-spec");
    expect(result.content[0].text).toContain("単体テスト仕様書");
  });

  it("generates it-spec context directly", async () => {
    const result = await handleGenerateDocument({
      doc_type: "it-spec",
      input_content: "Direct handler test for it-spec",
      language: "ja",
      templateDir: TEMPLATE_DIR,
    });

    expect(result.isError).toBeUndefined();
    expect(result.content[0].text).toContain("it-spec");
    expect(result.content[0].text).toContain("結合テスト仕様書");
  });

  it("generates st-spec context directly", async () => {
    const result = await handleGenerateDocument({
      doc_type: "st-spec",
      input_content: "Direct handler test for st-spec",
      language: "ja",
      templateDir: TEMPLATE_DIR,
    });

    expect(result.isError).toBeUndefined();
    expect(result.content[0].text).toContain("st-spec");
    expect(result.content[0].text).toContain("システムテスト仕様書");
  });

  it("generates uat-spec context directly", async () => {
    const result = await handleGenerateDocument({
      doc_type: "uat-spec",
      input_content: "Direct handler test for uat-spec",
      language: "ja",
      templateDir: TEMPLATE_DIR,
    });

    expect(result.isError).toBeUndefined();
    expect(result.content[0].text).toContain("uat-spec");
    expect(result.content[0].text).toContain("受入テスト仕様書");
  });
});

// ============================================================================
// manage_plan detect: test-spec split mode detection
// ============================================================================

describe("manage_plan detect: test-spec split mode", () => {
  let tmpDir: string;
  let configPath: string;

  const CONFIG_YAML = `
split:
  basic-design:
    enabled: true
  detail-design:
    enabled: true
  test-spec:
    enabled: true
`;

  beforeAll(async () => {
    tmpDir = await mkdtemp(join(tmpdir(), "sekkei-testspec-detect-"));
    configPath = join(tmpDir, "sekkei.config.yaml");
    await writeFile(configPath, CONFIG_YAML, "utf-8");
  });

  afterAll(async () => {
    await rm(tmpDir, { recursive: true, force: true });
  });

  it("returns should_trigger=true when features >= 3 and no active plan", async () => {
    const docsDir = join(tmpDir, "workspace-docs");
    await mkdir(docsDir, { recursive: true });
    await writeFile(join(docsDir, "functions-list.md"), [
      "# 機能一覧",
      "## 販売管理",
      "F-001 Sales",
      "## 在庫管理",
      "F-002 Inventory",
      "## レポート",
      "F-003 Reports",
    ].join("\n"), "utf-8");

    const result = await callPlan({
      action: "detect",
      workspace_path: tmpDir,
      config_path: configPath,
      doc_type: "test-spec",
    });

    const data = parseResult(result);
    expect(data.should_trigger).toBe(true);
    expect(data.feature_count).toBeGreaterThanOrEqual(3);
    expect(data.has_active_plan).toBe(false);
  });

  it("returns should_trigger=false when features < 3", async () => {
    const fewDir = await mkdtemp(join(tmpdir(), "sekkei-testspec-few-"));
    const cfg = join(fewDir, "sekkei.config.yaml");
    await writeFile(cfg, CONFIG_YAML, "utf-8");
    const docs = join(fewDir, "workspace-docs");
    await mkdir(docs, { recursive: true });
    await writeFile(join(docs, "functions-list.md"), "# FL\n## Feature A\nF-001", "utf-8");

    try {
      const result = await callPlan({
        action: "detect",
        workspace_path: fewDir,
        config_path: cfg,
        doc_type: "test-spec",
      });
      const data = parseResult(result);
      expect(data.should_trigger).toBe(false);
      expect(data.feature_count).toBeLessThan(3);
      expect(data.reason).toContain("below threshold");
    } finally {
      await rm(fewDir, { recursive: true, force: true });
    }
  });

  it("returns should_trigger=false when split config missing for test-spec", async () => {
    const noSplitDir = await mkdtemp(join(tmpdir(), "sekkei-testspec-nosplit-"));
    const noSplitCfg = join(noSplitDir, "sekkei.config.yaml");
    await writeFile(noSplitCfg, "split: {}", "utf-8");

    try {
      const result = await callPlan({
        action: "detect",
        workspace_path: noSplitDir,
        config_path: noSplitCfg,
        doc_type: "test-spec",
      });
      const data = parseResult(result);
      expect(data.should_trigger).toBe(false);
      expect(data.reason).toContain("not configured");
    } finally {
      await rm(noSplitDir, { recursive: true, force: true });
    }
  });

  it("returns should_trigger=false when active test-spec plan exists", async () => {
    // Create a test-spec plan to block further detection
    const planDir = await mkdtemp(join(tmpdir(), "sekkei-testspec-active-"));
    const planCfg = join(planDir, "sekkei.config.yaml");
    await writeFile(planCfg, CONFIG_YAML, "utf-8");
    const docs = join(planDir, "workspace-docs");
    await mkdir(docs, { recursive: true });
    await writeFile(join(docs, "functions-list.md"), [
      "# FL", "## A", "F-001", "## B", "F-002", "## C", "F-003",
    ].join("\n"), "utf-8");

    const features = [
      { id: "a", name: "A", complexity: "simple" as const, priority: 1 },
      { id: "b", name: "B", complexity: "medium" as const, priority: 2 },
      { id: "c", name: "C", complexity: "complex" as const, priority: 3 },
    ];

    try {
      // Create plan first
      await callPlan({
        action: "create",
        workspace_path: planDir,
        config_path: planCfg,
        doc_type: "test-spec",
        features,
      });

      // Now detect should return false (active plan exists)
      const result = await callPlan({
        action: "detect",
        workspace_path: planDir,
        config_path: planCfg,
        doc_type: "test-spec",
      });
      const data = parseResult(result);
      expect(data.should_trigger).toBe(false);
      expect(data.has_active_plan).toBe(true);
    } finally {
      await rm(planDir, { recursive: true, force: true });
    }
  });
});

// ============================================================================
// manage_plan create: test-spec plan structure
// ============================================================================

describe("manage_plan create: test-spec plan", () => {
  let tmpDir: string;
  let configPath: string;

  const CONFIG_YAML = `
split:
  test-spec:
    enabled: true
`;

  const FEATURES = [
    { id: "sal", name: "Sales", complexity: "medium" as const, priority: 1 },
    { id: "inv", name: "Inventory", complexity: "simple" as const, priority: 2 },
    { id: "rep", name: "Reports", complexity: "complex" as const, priority: 3 },
  ];

  beforeAll(async () => {
    tmpDir = await mkdtemp(join(tmpdir(), "sekkei-testspec-create-"));
    configPath = join(tmpDir, "sekkei.config.yaml");
    await writeFile(configPath, CONFIG_YAML, "utf-8");
  });

  afterAll(async () => {
    await rm(tmpDir, { recursive: true, force: true });
  });

  it("creates test-spec plan with NO shared phase (per-feature + validation only)", async () => {
    const result = await callPlan({
      action: "create",
      workspace_path: tmpDir,
      config_path: configPath,
      doc_type: "test-spec",
      features: FEATURES,
    });

    expect(result.isError).toBeUndefined();
    const data = parseResult(result);
    expect(data.success).toBe(true);
    expect(data.plan_id).toMatch(/^\d{8}-test-spec-generation$/);

    // test-spec has NO shared phase (docType === "test-spec" → hasShared = false in buildPhases)
    const types = data.phases.map((p: { type: string }) => p.type);
    expect(types).not.toContain("shared");
    expect(types).toContain("per-feature");
    expect(types).toContain("validation");

    // Per-feature phases should match the 3 features
    const featurePhases = data.phases.filter((p: { type: string }) => p.type === "per-feature");
    expect(featurePhases).toHaveLength(3);
  });

  it("numbers phases starting from 1 (no shared offset)", async () => {
    const dir2 = await mkdtemp(join(tmpdir(), "sekkei-testspec-numbering-"));
    const cfg2 = join(dir2, "sekkei.config.yaml");
    await writeFile(cfg2, CONFIG_YAML, "utf-8");

    try {
      const result = await callPlan({
        action: "create",
        workspace_path: dir2,
        config_path: cfg2,
        doc_type: "test-spec",
        features: FEATURES,
      });

      const data = parseResult(result);
      const numbers = data.phases.map((p: { number: number }) => p.number);
      // 3 per-feature + 1 validation = 4 phases, numbered 1-4
      expect(numbers).toEqual([1, 2, 3, 4]);
    } finally {
      await rm(dir2, { recursive: true, force: true });
    }
  });

  it("sorts features by priority", async () => {
    const dir3 = await mkdtemp(join(tmpdir(), "sekkei-testspec-priority-"));
    const cfg3 = join(dir3, "sekkei.config.yaml");
    await writeFile(cfg3, CONFIG_YAML, "utf-8");

    const unorderedFeatures = [
      { id: "rep", name: "Reports", complexity: "complex" as const, priority: 3 },
      { id: "sal", name: "Sales", complexity: "medium" as const, priority: 1 },
      { id: "inv", name: "Inventory", complexity: "simple" as const, priority: 2 },
    ];

    try {
      const result = await callPlan({
        action: "create",
        workspace_path: dir3,
        config_path: cfg3,
        doc_type: "test-spec",
        features: unorderedFeatures,
      });

      const data = parseResult(result);
      const featurePhases = data.phases.filter((p: { type: string }) => p.type === "per-feature");
      const names = featurePhases.map((p: { name: string }) => p.name);
      // Should be sorted by priority: Sales (1), Inventory (2), Reports (3)
      expect(names).toEqual(["Sales", "Inventory", "Reports"]);
    } finally {
      await rm(dir3, { recursive: true, force: true });
    }
  });
});

// ============================================================================
// assembleUpstream: test-spec specific upstream assembly
// ============================================================================

describe("assembleUpstream: test-spec", () => {
  let upstreamBase: string;

  beforeAll(async () => {
    upstreamBase = await mkdtemp(join(tmpdir(), "sekkei-upstream-testspec-"));
    const docsBase = join(upstreamBase, "workspace-docs");
    await mkdir(docsBase, { recursive: true });
    await mkdir(join(docsBase, "shared"), { recursive: true });
    await mkdir(join(docsBase, "features", "sal"), { recursive: true });
    await writeFile(join(docsBase, "requirements.md"), "# Requirements\nREQ-001 Main requirement", "utf-8");
    await writeFile(join(docsBase, "functions-list.md"), "# Functions\nF-001 Sales function", "utf-8");
    await writeFile(join(docsBase, "shared", "system.md"), "# System Architecture", "utf-8");
    await writeFile(join(docsBase, "features", "sal", "detail-design.md"), "# Sales Detail Design\nCLS-SAL-001", "utf-8");
    await writeFile(join(docsBase, "features", "sal", "basic-design.md"), "# Sales Basic Design\nSCR-SAL-001", "utf-8");
  });

  afterAll(async () => {
    await rm(upstreamBase, { recursive: true, force: true });
  });

  it("includes detail-design + basic-design for per-feature test-spec phase", async () => {
    const { assembleUpstream } = await import("../../src/lib/plan-state.js");
    const result = await assembleUpstream(upstreamBase, "test-spec", "per-feature", "sal");
    // test-spec per-feature reads detail-design.md and basic-design.md from feature dir
    expect(result).toContain("Sales Detail Design");
    expect(result).toContain("Sales Basic Design");
    expect(result).toContain("CLS-SAL-001");
    expect(result).toContain("SCR-SAL-001");
  });

  it("includes requirements + functions-list in base upstream", async () => {
    const { assembleUpstream } = await import("../../src/lib/plan-state.js");
    const result = await assembleUpstream(upstreamBase, "test-spec", "per-feature", "sal");
    expect(result).toContain("Requirements");
    expect(result).toContain("Functions");
    expect(result).toContain("REQ-001");
    expect(result).toContain("F-001");
  });
});

// ============================================================================
// Edge cases and boundary conditions
// ============================================================================

describe("test spec: edge cases", () => {
  let server: McpServer;

  beforeAll(() => {
    server = new McpServer({ name: "test", version: "0.0.1" });
    registerGenerateDocumentTool(server, TEMPLATE_DIR);
  });

  it("ut-spec feature scope without feature_name uses fallback label", async () => {
    // When scope="feature" but feature_name is omitted, buildSplitInstructions
    // uses "unknown" label and "UNK" prefix as fallback
    const result = await callTool(server, "generate_document", {
      doc_type: "ut-spec",
      input_content: "Test input",
      scope: "feature",
      // feature_name omitted
    });

    expect(result.isError).toBeUndefined();
    const text = result.content[0].text;
    expect(text).toContain("unknown");
    expect(text).toContain("UNK");
  });

  it("ut-spec without scope works as normal generation (non-split)", async () => {
    const result = await callTool(server, "generate_document", {
      doc_type: "ut-spec",
      input_content: "Test input",
      language: "ja",
    });

    expect(result.isError).toBeUndefined();
    const text = result.content[0].text;
    // Should NOT contain split mode instructions
    expect(text).not.toContain("Split Mode");
    // Should contain normal generation instructions
    expect(text).toContain("単体テスト仕様書");
  });

  it("it-spec append mode works", async () => {
    const result = await callTool(server, "generate_document", {
      doc_type: "it-spec",
      input_content: "Additional integration tests",
      append_mode: true,
    });

    const text = result.content[0].text;
    expect(text).toContain("Append Mode (MANDATORY)");
    expect(text).toContain("Preserve ALL existing requirements");
  });

  it("st-spec changelog preservation works", async () => {
    const existingContent = [
      "# システムテスト仕様書",
      "## 改訂履歴",
      "| 版数 | 日付 | 変更内容 | 変更者 |",
      "|------|------|----------|--------|",
      "| v1.0 | 2026-01-15 | 初版作成 | テスター |",
      "## テスト設計",
      "Content here",
    ].join("\n");

    const result = await callTool(server, "generate_document", {
      doc_type: "st-spec",
      input_content: "Updated system test spec",
      existing_content: existingContent,
    });

    const text = result.content[0].text;
    expect(text).toContain("Changelog Preservation (MANDATORY)");
    expect(text).toContain("v1.0");
    expect(text).toContain("初版作成");
  });

  it("uat-spec with multiple input sources works", async () => {
    const result = await callTool(server, "generate_document", {
      doc_type: "uat-spec",
      input_content: "Combined acceptance test sources",
      input_sources: [
        { name: "Business Owner", content: "Business acceptance criteria" },
        { name: "QA Team", content: "QA acceptance criteria" },
      ],
    });

    const text = result.content[0].text;
    expect(text).toContain("Multiple Input Sources");
    expect(text).toContain("Business Owner");
    expect(text).toContain("QA Team");
  });

  it("no project_type-specific instructions for any test spec type", async () => {
    const docTypes = ["ut-spec", "it-spec", "st-spec", "uat-spec"] as const;
    const projectTypes = ["saas", "mobile", "government", "finance"] as const;

    for (const docType of docTypes) {
      for (const projectType of projectTypes) {
        const result = await callTool(server, "generate_document", {
          doc_type: docType,
          input_content: "Test input",
          project_type: projectType,
        });

        expect(result.isError).toBeUndefined();
        // None of the test spec types have project_type-specific instructions
        expect(result.content[0].text).not.toContain("Project Type:");
      }
    }
  });
});
