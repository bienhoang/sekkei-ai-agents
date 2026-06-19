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

  it("loads functions-list template with valid frontmatter (vi, default)", async () => {
    const result = await loadTemplate(TEMPLATE_DIR, "functions-list", "vi");

    expect(result.metadata.doc_type).toBe("functions-list");
    expect(result.metadata.version).toBe("1.0");
    expect(result.metadata.language).toBe("vi");
    expect(result.metadata.sections).toBeInstanceOf(Array);
    expect(result.content).toContain("Danh sách chức năng");
  });

  it("loads requirements template (vi)", async () => {
    const result = await loadTemplate(TEMPLATE_DIR, "requirements", "vi");

    expect(result.metadata.doc_type).toBe("requirements");
    expect(result.content).toContain("Tài liệu Đặc tả Yêu cầu");
    expect(result.metadata.sections.length).toBeGreaterThanOrEqual(5);
  });

  it("loads basic-design template (vi)", async () => {
    const result = await loadTemplate(TEMPLATE_DIR, "basic-design", "vi");

    expect(result.metadata.doc_type).toBe("basic-design");
    expect(result.content).toContain("Tài liệu Thiết kế Cơ bản");
    expect(result.content).toContain("Danh sách màn hình");
    expect(result.content).toContain("Thiết kế CSDL");
    expect(result.content).toContain("API");
  });

  it("falls back to vi template when language-specific template is missing", async () => {
    // "en" is a valid language but has no template dir — should fall back to vi/
    const result = await loadTemplate(TEMPLATE_DIR, "functions-list", "en" as any);
    expect(result.metadata.doc_type).toBe("functions-list");
    expect(result.metadata.language).toBe("vi");
    expect(result.content).toContain("Danh sách chức năng");
  });

  it("throws for nonexistent base directory", async () => {
    await expect(
      loadTemplate("/nonexistent/path", "functions-list", "vi")
    ).rejects.toThrow(SekkeiError);
  });

  it("returns same object reference on second call (cache hit)", async () => {
    const first = await loadTemplate(TEMPLATE_DIR, "functions-list", "vi");
    const second = await loadTemplate(TEMPLATE_DIR, "functions-list", "vi");
    expect(first).toBe(second); // same object reference = cache hit
  });

  it("does NOT share cache across different base directories", async () => {
    const first = await loadTemplate(TEMPLATE_DIR, "functions-list", "vi");
    // Different base dir — should throw, not return cached first result
    await expect(
      loadTemplate("/nonexistent/path", "functions-list", "vi")
    ).rejects.toThrow(SekkeiError);
  });
});

describe("loadSharedTemplate", () => {
  beforeEach(() => {
    clearTemplateCache();
  });

  it("loads cover-page shared template (vi)", async () => {
    const content = await loadSharedTemplate(TEMPLATE_DIR, "cover-page");

    expect(content).toContain("Trang bìa");
  });

  it("loads update-history shared template (vi)", async () => {
    const content = await loadSharedTemplate(TEMPLATE_DIR, "update-history");

    expect(content).toContain("Lịch sử cập nhật");
  });

  it("throws for nonexistent shared template", async () => {
    await expect(
      loadSharedTemplate(TEMPLATE_DIR, "nonexistent")
    ).rejects.toThrow(SekkeiError);
  });
});
