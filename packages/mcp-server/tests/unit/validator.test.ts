import { describe, it, expect, afterEach } from "@jest/globals";
import { mkdtemp, rm, writeFile, mkdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { stringify as stringifyYaml } from "yaml";
import {
  validateCompleteness,
  validateCrossRefs,
  validateTableStructure,
  validateDocument,
  validateSplitDocument,
  validateChangelogPreservation,
} from "../../src/lib/validator.js";

/** Structural section block included in all valid test documents */
const STRUCTURAL = "## 改訂履歴\n| 版数 | 日付 | 変更内容 | 変更者 |\n## 承認欄\n## 配布先\n## 用語集\n";

describe("validateCompleteness", () => {
  it("passes when all sections present for functions-list", () => {
    const content = STRUCTURAL + "# 機能一覧\n\n| No. | 大分類 |";
    const issues = validateCompleteness(content, "functions-list");
    expect(issues).toHaveLength(0);
  });

  it("detects missing sections for requirements", () => {
    const content = STRUCTURAL + "# 要件定義書\n\n## 概要\nSome overview.";
    const issues = validateCompleteness(content, "requirements");
    const missing = issues.map((i) => i.message);
    expect(missing.some((m) => m.includes("機能要件"))).toBe(true);
    expect(missing.some((m) => m.includes("非機能要件"))).toBe(true);
  });

  it("passes for detail-design with all sections", () => {
    const content = [
      STRUCTURAL,
      "## 概要", "## モジュール設計", "## クラス設計", "## 画面設計詳細",
      "## DB詳細設計", "## API詳細仕様", "## 処理フロー", "## エラーハンドリング",
    ].join("\n\n");
    const issues = validateCompleteness(content, "detail-design");
    expect(issues).toHaveLength(0);
  });

  it("detects missing sections for ut-spec", () => {
    const content = STRUCTURAL + "## テスト設計\n\nSome content.";
    const issues = validateCompleteness(content, "ut-spec");
    expect(issues.length).toBeGreaterThan(0);
    expect(issues.some((i) => i.message.includes("単体テストケース"))).toBe(true);
  });

  it("detects missing structural section (承認欄)", () => {
    const content = "## 改訂履歴\n## 配布先\n## 用語集\n# 機能一覧";
    const issues = validateCompleteness(content, "functions-list");
    expect(issues.some((i) => i.message.includes("承認欄"))).toBe(true);
  });
});

describe("validateCrossRefs", () => {
  it("reports missing upstream IDs", () => {
    const upstream = "F-001, F-002, F-003";
    const current = "References F-001 and F-003 from upstream.";
    const report = validateCrossRefs(current, upstream, "basic-design");
    expect(report.missing).toEqual(["F-002"]);
    expect(report.coverage).toBe(67); // 2/3
  });

  it("reports orphaned IDs in current doc", () => {
    const upstream = "F-001";
    const current = "References F-001 and F-999 which is not upstream.";
    const report = validateCrossRefs(current, upstream, "basic-design");
    expect(report.orphaned).toEqual(["F-999"]);
  });

  it("returns 100% coverage when no upstream types expected", () => {
    const report = validateCrossRefs("content", "upstream", "meeting-minutes");
    expect(report.coverage).toBe(100);
  });

  it("returns 100% coverage for requirements (no upstream ID types)", () => {
    const report = validateCrossRefs("F-001 content", "F-001, F-002", "requirements");
    expect(report.coverage).toBe(100);
    expect(report.missing).toHaveLength(0);
    expect(report.upstream_ids).toHaveLength(0);
  });

  it("validates detail-design against basic-design IDs", () => {
    const upstream = "SCR-001, TBL-001, API-001";
    const current = "Uses SCR-001, TBL-001, API-001 from basic design.";
    const report = validateCrossRefs(current, upstream, "detail-design");
    expect(report.coverage).toBe(100);
    expect(report.missing).toHaveLength(0);
  });
});

describe("validateTableStructure", () => {
  it("passes when required columns present", () => {
    const content = "| 版数 | 日付 | 変更内容 | 変更者 |\n| 大分類 | 中分類 | 機能ID | 機能名 | 関連要件ID | 処理分類 |";
    const issues = validateTableStructure(content, "functions-list");
    expect(issues).toHaveLength(0);
  });

  it("detects missing table columns", () => {
    const content = "| 名前 | 説明 |";
    const issues = validateTableStructure(content, "functions-list");
    expect(issues.length).toBeGreaterThan(0);
    expect(issues[0].type).toBe("missing_column");
  });

  it("validates ut-spec columns", () => {
    const content = "| 版数 | 日付 | 変更内容 | 変更者 |\n| テストケースID | テスト対象 | テスト手順 |";
    const issues = validateTableStructure(content, "ut-spec");
    expect(issues).toHaveLength(0);
  });
});

describe("validateDocument (integration)", () => {
  it("returns valid for well-formed functions-list", () => {
    const content = [
      "# 機能一覧",
      "## 改訂履歴",
      "| 版数 | 日付 | 変更内容 | 変更者 |",
      "| 1.0 | 2026-01-01 | 初版作成 | テスト |",
      "## 承認欄",
      "## 配布先",
      "## 用語集",
      "",
      "| No. | 大分類 | 中分類 | 機能ID | 機能名 | 概要 | 関連要件ID | 処理分類 | 優先度 | 難易度 | 備考 |",
      "| 1 | 商品管理 | 商品登録 | F-001 | 商品登録 | 新規商品を登録する | REQ-001 | 入力 | 高 | 中 | |",
    ].join("\n");
    const result = validateDocument(content, "functions-list");
    expect(result.valid).toBe(true);
    expect(result.issues).toHaveLength(0);
  });

  it("returns issues with cross-ref report when upstream provided", () => {
    const upstream = "REQ-001, REQ-002, REQ-003";
    const current = STRUCTURAL + "## 概要\n## システム構成\n## 業務フロー\n## 画面設計\n## DB設計\n## 外部インターフェース\n| 画面ID | x |\n| テーブルID | x |\n| API | x |\nReferences REQ-001.";
    const result = validateDocument(current, "basic-design", upstream);
    expect(result.cross_ref_report).toBeDefined();
    expect(result.cross_ref_report!.missing).toContain("REQ-002");
  });
});

describe("validateChangelogPreservation", () => {
  const makeDoc = (rows: string[]) =>
    `# Doc\n## 改訂履歴\n| 版数 | 日付 | 変更内容 | 変更者 |\n|------|------|----------|--------|\n${rows.join("\n")}\n## 承認欄\n`;

  it("returns no issues when all rows preserved + 1 new", () => {
    const prev = makeDoc(["| 1.0 | 2026-01-01 | Initial | Author |"]);
    const next = makeDoc([
      "| 1.0 | 2026-01-01 | Initial | Author |",
      "| 1.1 | 2026-02-24 | Updated | |",
    ]);
    const issues = validateChangelogPreservation(prev, next);
    expect(issues).toHaveLength(0);
  });

  it("returns error when rows missing", () => {
    const prev = makeDoc([
      "| 1.0 | 2026-01-01 | Initial | Author |",
      "| 1.1 | 2026-01-15 | Update | Author |",
    ]);
    const next = makeDoc(["| 1.1 | 2026-01-15 | Update | Author |"]);
    const issues = validateChangelogPreservation(prev, next);
    expect(issues.some(i => i.severity === "error")).toBe(true);
  });

  it("returns error when row count decreased", () => {
    const prev = makeDoc([
      "| 1.0 | 2026-01-01 | A | X |",
      "| 1.1 | 2026-01-15 | B | Y |",
    ]);
    const next = makeDoc(["| 1.2 | 2026-02-24 | C | Z |"]);
    const issues = validateChangelogPreservation(prev, next);
    expect(issues.some(i => i.message.includes("decreased"))).toBe(true);
  });

  it("returns empty when previous has no changelog", () => {
    const prev = "# Doc\n## 承認欄\n";
    const next = makeDoc(["| 1.0 | 2026-02-24 | New | |"]);
    expect(validateChangelogPreservation(prev, next)).toHaveLength(0);
  });

  it("returns warning when more than 1 new row", () => {
    const prev = makeDoc(["| 1.0 | 2026-01-01 | A | X |"]);
    const next = makeDoc([
      "| 1.0 | 2026-01-01 | A | X |",
      "| 1.1 | 2026-02-01 | B | Y |",
      "| 1.2 | 2026-02-24 | C | Z |",
    ]);
    const issues = validateChangelogPreservation(prev, next);
    expect(issues.some(i => i.severity === "warning")).toBe(true);
  });

  it("handles whitespace differences gracefully", () => {
    const prev = makeDoc(["| 1.0 | 2026-01-01 | Initial | Author |"]);
    const next = makeDoc([
      "|  1.0  |  2026-01-01  |  Initial  |  Author  |",
      "| 1.1 | 2026-02-24 | Updated | |",
    ]);
    const issues = validateChangelogPreservation(prev, next);
    expect(issues.filter(i => i.severity === "error")).toHaveLength(0);
  });
});

describe("validateSplitDocument", () => {
  let tmpDir: string;
  let manifestPath: string;

  afterEach(async () => {
    if (tmpDir) {
      await rm(tmpDir, { recursive: true, force: true });
    }
  });

  async function setupSplitFixture(opts: {
    sharedContent: string;
    featureContent: string;
  }): Promise<{ manifestPath: string; manifest: import("../../src/types/documents.js").Manifest }> {
    tmpDir = await mkdtemp(join(tmpdir(), "sekkei-validator-test-"));
    await mkdir(join(tmpDir, "shared"), { recursive: true });
    await mkdir(join(tmpDir, "features", "sal"), { recursive: true });

    const sharedFile = "shared/arch.md";
    const featureFile = "features/sal/bd.md";

    await writeFile(join(tmpDir, sharedFile), opts.sharedContent, "utf-8");
    await writeFile(join(tmpDir, featureFile), opts.featureContent, "utf-8");

    const manifest: import("../../src/types/documents.js").Manifest = {
      version: "1.0",
      project: "test-project",
      language: "ja",
      documents: {
        "basic-design": {
          type: "split",
          status: "in-progress",
          shared: [{ file: sharedFile, section: "system-architecture", title: "システム構成" }],
          features: [{ name: "sales-management", display: "Sales", file: featureFile }],
          merge_order: ["shared", "features"],
        },
      },
    };

    manifestPath = join(tmpDir, "_index.yaml");
    await writeFile(manifestPath, stringifyYaml(manifest), "utf-8");
    return { manifestPath, manifest };
  }

  it("validates split document with valid shared + feature files", async () => {
    const { manifestPath, manifest } = await setupSplitFixture({
      sharedContent: "## システム構成\n\nArchitecture overview.\n\n| 版数 | 日付 | 変更内容 | 変更者 |\n| 画面ID | 説明 |\n| テーブルID | 説明 |\n| API | 説明 |",
      featureContent: "## 概要\n\nFeature overview.\n\n## 業務フロー\n\nFlow.\n\n## 画面設計\n\nUI.\n\n| 画面ID | 説明 |\n| テーブルID | 説明 |\n| API | 説明 |",
    });

    const result = await validateSplitDocument(manifestPath, manifest, "basic-design");
    expect(result.per_file).toHaveLength(2);
    // Shared file has the required heading, feature file has all required sections
    const sharedFileResult = result.per_file[0];
    const featureFileResult = result.per_file[1];
    expect(sharedFileResult.issues).toHaveLength(0);
    expect(featureFileResult.issues).toHaveLength(0);
    expect(result.valid).toBe(true);
  });

  it("reports missing heading in shared file", async () => {
    const { manifestPath, manifest } = await setupSplitFixture({
      sharedContent: "## 概要\n\nNo architecture heading here.",
      featureContent: "## 概要\n\n## 業務フロー\n\n## 画面設計\n\n| 画面ID | 説明 |\n| テーブルID | 説明 |\n| API | 説明 |",
    });

    const result = await validateSplitDocument(manifestPath, manifest, "basic-design");
    const sharedFileResult = result.per_file[0];
    expect(sharedFileResult.issues.length).toBeGreaterThan(0);
    expect(sharedFileResult.issues[0].type).toBe("missing_section");
    expect(sharedFileResult.issues[0].message).toContain("システム構成");
    expect(result.valid).toBe(false);
  });

  it("reports missing required sections in feature file", async () => {
    const { manifestPath, manifest } = await setupSplitFixture({
      sharedContent: "## システム構成\n\nArch.\n\n| 画面ID | 説明 |\n| テーブルID | 説明 |\n| API | 説明 |",
      featureContent: "## 概要\n\nOnly overview, missing 業務フロー and 画面設計.",
    });

    const result = await validateSplitDocument(manifestPath, manifest, "basic-design");
    const featureFileResult = result.per_file[1];
    expect(featureFileResult.issues.length).toBeGreaterThan(0);
    expect(featureFileResult.issues.some(i => i.message.includes("業務フロー"))).toBe(true);
    expect(result.valid).toBe(false);
  });

  it("throws SekkeiError when docType is not split", async () => {
    tmpDir = await mkdtemp(join(tmpdir(), "sekkei-validator-test-"));
    const manifest: import("../../src/types/documents.js").Manifest = {
      version: "1.0",
      project: "test",
      language: "ja",
      documents: {},
    };
    manifestPath = join(tmpDir, "_index.yaml");
    await writeFile(manifestPath, stringifyYaml(manifest), "utf-8");

    await expect(
      validateSplitDocument(manifestPath, manifest, "basic-design")
    ).rejects.toThrow("not a split document");
  });
});
