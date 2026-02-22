import { describe, it, expect, beforeAll, afterAll } from "@jest/globals";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { mkdtemp, rm, writeFile, mkdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerGetTemplateTool } from "../../src/tools/get-template.js";
import { registerGenerateDocumentTool } from "../../src/tools/generate.js";
import { registerExportDocumentTool } from "../../src/tools/export.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const TEMPLATE_DIR = resolve(__dirname, "../../templates");

/**
 * Helper to call a tool on an McpServer instance.
 * Uses the internal tool map since we can't connect a transport in unit tests.
 */
async function callTool(
  server: McpServer,
  name: string,
  args: Record<string, unknown>
): Promise<{ content: Array<{ type: string; text: string }>; isError?: boolean }> {
  const result = await (server as any)._registeredTools[name].handler(args, {});
  return result;
}

describe("get_template tool", () => {
  let server: McpServer;

  beforeAll(() => {
    server = new McpServer({ name: "test", version: "0.0.1" });
    registerGetTemplateTool(server, TEMPLATE_DIR);
  });

  it("registers on the server", () => {
    expect((server as any)._registeredTools["get_template"]).toBeDefined();
  });

  it("returns functions-list template content", async () => {
    const result = await callTool(server, "get_template", {
      doc_type: "functions-list",
      language: "ja",
    });

    expect(result.isError).toBeUndefined();
    expect(result.content[0].text).toContain("機能一覧");
  });

  it("returns basic-design template content", async () => {
    const result = await callTool(server, "get_template", {
      doc_type: "basic-design",
      language: "ja",
    });

    expect(result.content[0].text).toContain("基本設計書");
  });

  it("falls back to ja template for en language (no en/ template dir)", async () => {
    const result = await callTool(server, "get_template", {
      doc_type: "functions-list",
      language: "en",
    });

    expect(result.isError).toBeUndefined();
    expect(result.content[0].text).toContain("機能一覧");
  });
});

describe("generate_document tool", () => {
  let server: McpServer;

  beforeAll(() => {
    server = new McpServer({ name: "test", version: "0.0.1" });
    registerGenerateDocumentTool(server, TEMPLATE_DIR);
  });

  it("registers on the server", () => {
    expect((server as any)._registeredTools["generate_document"]).toBeDefined();
  });

  it("returns generation context for functions-list", async () => {
    const result = await callTool(server, "generate_document", {
      doc_type: "functions-list",
      input_content: "ECサイトの機能を定義してください",
      project_name: "Test EC Site",
      language: "ja",
    });

    const text = result.content[0].text;
    expect(text).toContain("Document Generation Context");
    expect(text).toContain("functions-list");
    expect(text).toContain("Test EC Site");
    expect(text).toContain("AI Instructions");
    expect(text).toContain("Template");
    expect(text).toContain("Input Content");
    expect(text).toContain("ECサイトの機能を定義してください");
  });

  it("returns generation context for requirements", async () => {
    const result = await callTool(server, "generate_document", {
      doc_type: "requirements",
      input_content: "機能一覧の内容を基に要件を定義",
      language: "ja",
    });

    const text = result.content[0].text;
    expect(text).toContain("requirements");
    expect(text).toContain("Unnamed Project");
    expect(text).toContain("要件定義書");
  });

  it("returns generation context for basic-design", async () => {
    const result = await callTool(server, "generate_document", {
      doc_type: "basic-design",
      input_content: "要件定義書の内容を基に基本設計",
      project_name: "My App",
      language: "ja",
    });

    const text = result.content[0].text;
    expect(text).toContain("basic-design");
    expect(text).toContain("My App");
    expect(text).toContain("基本設計書");
    expect(text).toContain("Mermaid");
  });

  it("returns generation context for detail-design", async () => {
    const result = await callTool(server, "generate_document", {
      doc_type: "detail-design",
      input_content: "基本設計書の内容を基に詳細設計",
      project_name: "My App",
      language: "ja",
    });

    const text = result.content[0].text;
    expect(text).toContain("detail-design");
    expect(text).toContain("詳細設計書");
    expect(text).toContain("クラス設計");
  });

  it("returns generation context for test-spec", async () => {
    const result = await callTool(server, "generate_document", {
      doc_type: "test-spec",
      input_content: "詳細設計書の内容を基にテスト仕様",
      project_name: "My App",
      language: "ja",
    });

    const text = result.content[0].text;
    expect(text).toContain("test-spec");
    expect(text).toContain("テスト仕様書");
    expect(text).toContain("トレーサビリティ");
  });

  it("generate_document with scope=shared returns shared instructions", async () => {
    const result = await callTool(server, "generate_document", {
      doc_type: "basic-design",
      input_content: "Test input",
      scope: "shared",
    });
    expect(result.content[0].text).toContain("Shared Sections (03-system/)");
    expect(result.content[0].text).toContain("Output Path");
    expect(result.content[0].text).toContain("03-system/");
  });

  it("generate_document with scope=feature returns feature instructions", async () => {
    const result = await callTool(server, "generate_document", {
      doc_type: "basic-design",
      input_content: "Test input",
      scope: "feature",
      feature_name: "sales-management",
    });
    expect(result.content[0].text).toContain('Feature "sales-management"');
    expect(result.content[0].text).toContain("Output Path");
    expect(result.content[0].text).toContain("05-features/sales-management/basic-design.md");
  });

  it("generate_document without split params returns original behavior", async () => {
    const result = await callTool(server, "generate_document", {
      doc_type: "basic-design",
      input_content: "Test input",
      project_name: "Test",
    });
    expect(result.content[0].text).not.toContain("Split Mode");
    expect(result.content[0].text).not.toContain("Output Path");
  });

  it("generate_document with doc_type=overview returns overview context", async () => {
    const result = await callTool(server, "generate_document", {
      doc_type: "overview",
      input_content: "Project brief for a new SaaS product",
      project_name: "My SaaS",
      language: "ja",
    });
    const text = result.content[0].text;
    expect(text).toContain("overview");
    expect(text).toContain("My SaaS");
    expect(text).toContain("01-overview.md");
  });
});

describe("export_document tool — input validation", () => {
  let server: McpServer;

  beforeAll(() => {
    server = new McpServer({ name: "test", version: "0.0.1" });
    registerExportDocumentTool(server);
  });

  it("registers on the server", () => {
    expect((server as any)._registeredTools["export_document"]).toBeDefined();
  });

  it("returns error when source=file and content is missing", async () => {
    const result = await callTool(server, "export_document", {
      doc_type: "basic-design",
      format: "xlsx",
      output_path: "/tmp/out.xlsx",
      source: "file",
    });
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain("VALIDATION_FAILED");
  });

  it("returns error when source=manifest and manifest_path is missing", async () => {
    const result = await callTool(server, "export_document", {
      doc_type: "basic-design",
      format: "xlsx",
      output_path: "/tmp/out.xlsx",
      source: "manifest",
    });
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain("MANIFEST_ERROR");
  });

  it("returns error when manifest_path does not exist", async () => {
    const result = await callTool(server, "export_document", {
      doc_type: "basic-design",
      format: "xlsx",
      output_path: "/tmp/out.xlsx",
      source: "manifest",
      manifest_path: "/nonexistent/_index.yaml",
    });
    expect(result.isError).toBe(true);
  });
});

describe("export_document tool — manifest merge mode", () => {
  let server: McpServer;
  let tmpDir: string;

  beforeAll(async () => {
    server = new McpServer({ name: "test", version: "0.0.1" });
    registerExportDocumentTool(server);

    tmpDir = await mkdtemp(join(tmpdir(), "sekkei-export-"));
    await mkdir(join(tmpDir, "03-system"), { recursive: true });
    await mkdir(join(tmpDir, "05-features/sales-management"), { recursive: true });

    await writeFile(
      join(tmpDir, "03-system/arch.md"),
      "---\nsection: architecture\n---\n# Architecture\n\nSystem design.", "utf-8"
    );
    await writeFile(
      join(tmpDir, "05-features/sales-management/basic-design.md"),
      "---\nfeature: sales-management\n---\n# Sales Management\n\nSales module.", "utf-8"
    );

    // Write a real manifest YAML
    const manifestYaml = [
      "version: '1.0'",
      "project: TestProject",
      "language: ja",
      "documents:",
      "  basic-design:",
      "    type: split",
      "    status: complete",
      "    shared:",
      "      - file: 03-system/arch.md",
      "        section: system-architecture",
      "        title: アーキテクチャ",
      "    features:",
      "      - name: sales-management",
      "        display: 販売管理",
      "        file: 05-features/sales-management/basic-design.md",
      "    merge_order:",
      "      - shared",
      "      - features",
    ].join("\n");
    await writeFile(join(tmpDir, "_index.yaml"), manifestYaml, "utf-8");
  });

  afterAll(async () => {
    try { await rm(tmpDir, { recursive: true }); } catch { /* ignore */ }
  });

  it("returns MANIFEST_ERROR when manifest path points to nonexistent file", async () => {
    const result = await callTool(server, "export_document", {
      doc_type: "basic-design",
      format: "pdf",
      output_path: "/tmp/out.pdf",
      source: "manifest",
      manifest_path: join(tmpDir, "missing.yaml"),
    });
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain("MANIFEST_ERROR");
  });
});
