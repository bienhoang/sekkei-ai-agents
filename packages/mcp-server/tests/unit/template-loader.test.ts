import { describe, it, expect, beforeEach } from "@jest/globals";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { loadTemplate, loadSharedTemplate, clearTemplateCache } from "../../src/lib/template-loader.js";
import { SekkeiError } from "../../src/lib/errors.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const TEMPLATE_DIR = resolve(__dirname, "../../templates");

describe("loadTemplate", () => {
  beforeEach(() => {
    clearTemplateCache();
  });

  it("loads functions-list template with valid frontmatter", async () => {
    const result = await loadTemplate(TEMPLATE_DIR, "functions-list", "ja");

    expect(result.metadata.doc_type).toBe("functions-list");
    expect(result.metadata.version).toBe("1.0");
    expect(result.metadata.language).toBe("ja");
    expect(result.metadata.sections).toBeInstanceOf(Array);
    expect(result.content).toContain("機能一覧");
  });

  it("loads requirements template", async () => {
    const result = await loadTemplate(TEMPLATE_DIR, "requirements", "ja");

    expect(result.metadata.doc_type).toBe("requirements");
    expect(result.content).toContain("要件定義書");
    expect(result.metadata.sections.length).toBeGreaterThanOrEqual(5);
  });

  it("loads basic-design template", async () => {
    const result = await loadTemplate(TEMPLATE_DIR, "basic-design", "ja");

    expect(result.metadata.doc_type).toBe("basic-design");
    expect(result.content).toContain("基本設計書");
    expect(result.content).toContain("画面一覧");
    expect(result.content).toContain("テーブル定義");
    expect(result.content).toContain("API一覧");
  });

  it("falls back to ja template when language-specific template is missing", async () => {
    // "en" is a valid language but has no template dir — should fall back to ja/
    const result = await loadTemplate(TEMPLATE_DIR, "functions-list", "en" as any);
    expect(result.metadata.doc_type).toBe("functions-list");
    expect(result.metadata.language).toBe("ja");
    expect(result.content).toContain("機能一覧");
  });

  it("throws for nonexistent base directory", async () => {
    await expect(
      loadTemplate("/nonexistent/path", "functions-list", "ja")
    ).rejects.toThrow(SekkeiError);
  });

  it("returns same object reference on second call (cache hit)", async () => {
    const first = await loadTemplate(TEMPLATE_DIR, "functions-list", "ja");
    const second = await loadTemplate(TEMPLATE_DIR, "functions-list", "ja");
    expect(first).toBe(second); // same object reference = cache hit
  });

  it("does NOT share cache across different base directories", async () => {
    const first = await loadTemplate(TEMPLATE_DIR, "functions-list", "ja");
    // Different base dir — should throw, not return cached first result
    await expect(
      loadTemplate("/nonexistent/path", "functions-list", "ja")
    ).rejects.toThrow(SekkeiError);
  });
});

describe("loadSharedTemplate", () => {
  beforeEach(() => {
    clearTemplateCache();
  });

  it("loads cover-page shared template", async () => {
    const content = await loadSharedTemplate(TEMPLATE_DIR, "cover-page");

    expect(content).toContain("表紙");
    expect(content).toContain("プロジェクト名");
  });

  it("loads update-history shared template", async () => {
    const content = await loadSharedTemplate(TEMPLATE_DIR, "update-history");

    expect(content).toContain("更新履歴");
    expect(content).toContain("バージョン");
  });

  it("throws for nonexistent shared template", async () => {
    await expect(
      loadSharedTemplate(TEMPLATE_DIR, "nonexistent")
    ).rejects.toThrow(SekkeiError);
  });
});
