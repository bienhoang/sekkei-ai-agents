import { describe, it, expect, beforeEach, afterAll } from "@jest/globals";
import { mkdtemp, rm, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  createManifest,
  readManifest,
  writeManifest,
  addDocument,
  addFeature,
  getMergeOrder,
  getFeatureFiles,
  addTranslation,
  createTranslationManifest,
} from "../../src/lib/manifest-manager.js";
import type { Manifest, SplitDocument, ManifestDocument } from "../../src/types/documents.js";

let tmpDir: string;

beforeEach(async () => {
  tmpDir = await mkdtemp(join(tmpdir(), "sekkei-manifest-"));
});

afterAll(async () => {
  // Clean up all temp dirs (best effort)
  try { await rm(tmpDir, { recursive: true }); } catch { /* ignore */ }
});

describe("createManifest + readManifest round-trip", () => {
  it("creates valid manifest readable back via readManifest", async () => {
    const path = await createManifest(tmpDir, "Test Project", "ja");
    const manifest = await readManifest(path);
    expect(manifest.version).toBe("1.0");
    expect(manifest.project).toBe("Test Project");
    expect(manifest.language).toBe("ja");
    expect(manifest.documents).toEqual({});
  });
});

describe("readManifest error handling", () => {
  it("throws on missing file", async () => {
    await expect(readManifest(join(tmpDir, "nonexistent.yaml")))
      .rejects.toThrow("Manifest not found");
  });

  it("throws on invalid YAML structure", async () => {
    const badPath = join(tmpDir, "_index.yaml");
    const { writeFile: wf } = await import("node:fs/promises");
    await wf(badPath, "version: 1\nproject: X\n", "utf-8"); // missing language
    await expect(readManifest(badPath)).rejects.toThrow("Manifest validation failed");
  });

  it("throws on oversized file", async () => {
    const bigPath = join(tmpDir, "_index.yaml");
    const { writeFile: wf } = await import("node:fs/promises");
    const bigContent = "a".repeat(51 * 1024);
    await wf(bigPath, bigContent, "utf-8");
    await expect(readManifest(bigPath)).rejects.toThrow("50KB limit");
  });
});

describe("addDocument", () => {
  it("adds a split document entry", async () => {
    const path = await createManifest(tmpDir, "Proj", "ja");
    await addDocument(path, "basic-design", {
      type: "split",
      status: "in-progress",
      shared: [{ file: "03-system/arch.md", section: "system-architecture", title: "システム構成" }],
      features: [{ name: "sales-management", display: "販売管理", file: "05-features/sales-management/basic-design.md" }],
      merge_order: ["shared", "features"],
    });
    const manifest = await readManifest(path);
    const doc = manifest.documents["basic-design"] as SplitDocument;
    expect(doc.type).toBe("split");
    expect(doc.shared).toHaveLength(1);
    expect(doc.features).toHaveLength(1);
    expect(doc.features[0].name).toBe("sales-management");
  });
});

describe("addFeature", () => {
  it("appends a feature to a split document", async () => {
    const path = await createManifest(tmpDir, "Proj", "ja");
    await addDocument(path, "basic-design", {
      type: "split",
      status: "in-progress",
      shared: [],
      features: [{ name: "sales-management", display: "販売管理", file: "05-features/sales-management/bd.md" }],
      merge_order: ["shared", "features"],
    });
    await addFeature(path, "basic-design", { name: "accounting", display: "会計", file: "05-features/accounting/bd.md" });
    const manifest = await readManifest(path);
    const doc = manifest.documents["basic-design"] as SplitDocument;
    expect(doc.features).toHaveLength(2);
    expect(doc.features[1].name).toBe("accounting");
  });

  it("updates existing feature by name", async () => {
    const path = await createManifest(tmpDir, "Proj", "ja");
    await addDocument(path, "basic-design", {
      type: "split",
      status: "in-progress",
      shared: [],
      features: [{ name: "sales-management", display: "旧名", file: "old.md" }],
      merge_order: ["shared", "features"],
    });
    await addFeature(path, "basic-design", { name: "sales-management", display: "新名", file: "new.md" });
    const manifest = await readManifest(path);
    const doc = manifest.documents["basic-design"] as SplitDocument;
    expect(doc.features).toHaveLength(1);
    expect(doc.features[0].display).toBe("新名");
  });

  it("throws when doc does not exist in manifest", async () => {
    const path = await createManifest(tmpDir, "Proj", "ja");
    await expect(addFeature(path, "functions-list", { name: "sales-management", display: "X", file: "x.md" }))
      .rejects.toThrow("not found in manifest");
  });
});

describe("getMergeOrder", () => {
  it("returns shared then feature files", () => {
    const manifest: Manifest = {
      version: "1.0",
      project: "X",
      language: "ja",
      documents: {
        "basic-design": {
          type: "split",
          status: "complete",
          shared: [
            { file: "03-system/arch.md", section: "system-architecture", title: "アーキ" },
            { file: "03-system/db.md", section: "database-design", title: "DB" },
          ],
          features: [
            { name: "sales-management", display: "販売管理", file: "05-features/sales-management/bd.md" },
            { name: "accounting", display: "会計", file: "05-features/accounting/bd.md" },
          ],
          merge_order: ["shared", "features"],
        },
      },
    };
    const order = getMergeOrder(manifest, "basic-design");
    expect(order).toEqual([
      "03-system/arch.md", "03-system/db.md",
      "05-features/sales-management/bd.md", "05-features/accounting/bd.md",
    ]);
  });

  it("filters out index.md files", () => {
    const manifest: Manifest = {
      version: "1.0",
      project: "X",
      language: "ja",
      documents: {
        "basic-design": {
          type: "split",
          status: "complete",
          shared: [
            { file: "03-system/index.md", section: "index", title: "Index" },
            { file: "03-system/arch.md", section: "system-architecture", title: "Arch" },
          ],
          features: [],
          merge_order: ["shared"],
        },
      },
    };
    expect(getMergeOrder(manifest, "basic-design")).toEqual(["03-system/arch.md"]);
  });

  it("returns empty array for unknown doc type", () => {
    const manifest: Manifest = {
      version: "1.0", project: "X", language: "ja", documents: {},
    };
    expect(getMergeOrder(manifest, "nonexistent")).toEqual([]);
  });
});

describe("getFeatureFiles", () => {
  it("returns feature file paths for split doc", () => {
    const manifest: Manifest = {
      version: "1.0",
      project: "X",
      language: "ja",
      documents: {
        "basic-design": {
          type: "split",
          status: "complete",
          shared: [{ file: "03-system/a.md", section: "x", title: "X" }],
          features: [
            { name: "sales-management", display: "販売管理", file: "05-features/sales-management/bd.md" },
            { name: "accounting", display: "会計", file: "05-features/accounting/bd.md" },
          ],
          merge_order: ["shared", "features"],
        },
      },
    };
    expect(getFeatureFiles(manifest, "basic-design")).toEqual([
      "05-features/sales-management/bd.md",
      "05-features/accounting/bd.md",
    ]);
  });
});

describe("addTranslation", () => {
  it("adds translation reference to manifest", async () => {
    const path = await createManifest(tmpDir, "Proj", "ja");
    await addTranslation(path, "en", "translations/en/_index.yaml");
    const manifest = await readManifest(path);
    expect(manifest.translations).toHaveLength(1);
    expect(manifest.translations![0].lang).toBe("en");
  });

  it("updates existing translation entry", async () => {
    const path = await createManifest(tmpDir, "Proj", "ja");
    await addTranslation(path, "en", "old.yaml");
    await addTranslation(path, "en", "new.yaml");
    const manifest = await readManifest(path);
    expect(manifest.translations).toHaveLength(1);
    expect(manifest.translations![0].manifest).toBe("new.yaml");
  });
});

describe("createTranslationManifest", () => {
  it("mirrors source manifest structure with target language", () => {
    const source: Manifest = {
      version: "1.0",
      project: "Proj",
      language: "ja",
      documents: {
        "basic-design": {
          type: "split",
          status: "complete",
          shared: [{ file: "03-system/a.md", section: "x", title: "X" }],
          features: [{ name: "sales-management", display: "販売管理", file: "05-features/sales-management/bd.md" }],
          merge_order: ["shared", "features"],
        },
      },
    };
    const translated = createTranslationManifest(source, "ja");
    expect(translated.language).toBe("ja");
    expect(translated.source_language).toBe("ja");
    expect(translated.documents["basic-design"]).toBeDefined();
  });
});
