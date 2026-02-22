import { describe, it, expect, beforeEach, afterAll } from "@jest/globals";
import { mkdtemp, rm, writeFile, mkdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  stripFrontmatter,
  generateMergedFrontmatter,
  mergeFromManifest,
} from "../../src/lib/merge-documents.js";
import type { Manifest } from "../../src/types/documents.js";

describe("stripFrontmatter", () => {
  it("removes YAML frontmatter", () => {
    const content = "---\ndoc_type: basic-design\nversion: 1.0\n---\n# Title\n\nBody text";
    expect(stripFrontmatter(content)).toBe("# Title\n\nBody text");
  });

  it("returns content unchanged when no frontmatter", () => {
    const content = "# Just a heading\n\nBody text";
    expect(stripFrontmatter(content)).toBe("# Just a heading\n\nBody text");
  });

  it("handles empty content after frontmatter", () => {
    const content = "---\nkey: val\n---\n";
    expect(stripFrontmatter(content)).toBe("");
  });
});

describe("generateMergedFrontmatter", () => {
  it("produces valid YAML with correct fields", () => {
    const manifest: Manifest = {
      version: "1.0", project: "TestProj", language: "ja", documents: {},
    };
    const fm = generateMergedFrontmatter(manifest, "basic-design");
    expect(fm).toContain("doc_type: basic-design");
    expect(fm).toContain("project: TestProj");
    expect(fm).toContain("language: ja");
    expect(fm).toContain("merged: true");
    expect(fm).toMatch(/^---\n/);
    expect(fm).toMatch(/\n---$/);
  });
});

describe("mergeFromManifest", () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = await mkdtemp(join(tmpdir(), "sekkei-merge-"));
    // Create test files with numbered structure
    await mkdir(join(tmpDir, "03-system"), { recursive: true });
    await mkdir(join(tmpDir, "05-features/sales-management"), { recursive: true });
    await writeFile(join(tmpDir, "03-system/arch.md"),
      "---\nsection: architecture\n---\n# Architecture\n\nSystem design here.", "utf-8");
    await writeFile(join(tmpDir, "03-system/db.md"),
      "---\nsection: database\n---\n# Database\n\nDB schema here.", "utf-8");
    await writeFile(join(tmpDir, "05-features/sales-management/basic-design.md"),
      "---\nfeature: sales-management\n---\n# Sales Management\n\nSales details.", "utf-8");
  });

  afterAll(async () => {
    try { await rm(tmpDir, { recursive: true }); } catch { /* ignore */ }
  });

  it("merges files in order with separators", async () => {
    const manifestPath = join(tmpDir, "_index.yaml");
    const manifest: Manifest = {
      version: "1.0", project: "Test", language: "ja",
      documents: {
        "basic-design": {
          type: "split",
          status: "complete",
          shared: [
            { file: "03-system/arch.md", section: "system-architecture", title: "アーキ" },
            { file: "03-system/db.md", section: "database-design", title: "DB" },
          ],
          features: [
            { name: "sales-management", display: "販売管理", file: "05-features/sales-management/basic-design.md" },
          ],
          merge_order: ["shared", "features"],
        },
      },
    };

    const merged = await mergeFromManifest(manifestPath, manifest, "basic-design");
    expect(merged).toContain("merged: true");
    expect(merged).toContain("# Architecture");
    expect(merged).toContain("# Database");
    expect(merged).toContain("# Sales Management");
    // Frontmatter stripped from individual files
    expect(merged).not.toContain("section: architecture");
    // Separator between sections
    expect(merged).toContain("---\n\n");
  });

  it("filters to single feature when featureName provided", async () => {
    const manifestPath = join(tmpDir, "_index.yaml");
    const manifest: Manifest = {
      version: "1.0", project: "Test", language: "ja",
      documents: {
        "basic-design": {
          type: "split",
          status: "complete",
          shared: [
            { file: "03-system/arch.md", section: "system-architecture", title: "アーキ" },
          ],
          features: [
            { name: "sales-management", display: "販売管理", file: "05-features/sales-management/basic-design.md" },
          ],
          merge_order: ["shared", "features"],
        },
      },
    };

    const merged = await mergeFromManifest(manifestPath, manifest, "basic-design", "sales-management");
    expect(merged).toContain("# Architecture");
    expect(merged).toContain("# Sales Management");
  });
});
