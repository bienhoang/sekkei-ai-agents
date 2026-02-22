import { describe, it, expect } from "@jest/globals";
import { validateContentDepth, validateDocument } from "../../src/lib/validator.js";

// ---------------------------------------------------------------------------
// validateContentDepth — isolated unit tests
// ---------------------------------------------------------------------------

describe("validateContentDepth — basic-design", () => {
  const BASE = "## 基本設計書\n";

  it("warns when no SCR-xxx in content", () => {
    const issues = validateContentDepth(BASE + "| TBL-001 |\n| API-001 |", "basic-design");
    expect(issues.some((i) => i.message.includes("SCR-xxx"))).toBe(true);
    expect(issues.every((i) => i.severity === "warning")).toBe(true);
    expect(issues.every((i) => i.type === "completeness")).toBe(true);
  });

  it("warns when no TBL-xxx in content", () => {
    const issues = validateContentDepth(BASE + "| SCR-001 |\n| API-001 |", "basic-design");
    expect(issues.some((i) => i.message.includes("TBL-xxx"))).toBe(true);
  });

  it("warns when no API-xxx in content", () => {
    const issues = validateContentDepth(BASE + "| SCR-001 |\n| TBL-001 |", "basic-design");
    expect(issues.some((i) => i.message.includes("API-xxx"))).toBe(true);
  });

  it("returns no issues when SCR-001, TBL-001, API-001 all present", () => {
    const content = BASE + "| SCR-001 | 商品登録画面 |\n| TBL-001 | 商品テーブル |\n| API-001 | 商品API |";
    const issues = validateContentDepth(content, "basic-design");
    expect(issues).toHaveLength(0);
  });
});

describe("validateContentDepth — requirements", () => {
  it("warns when fewer than 3 F-xxx IDs present", () => {
    const content = "## 機能要件\nF-001 ログイン\nF-002 ログアウト";
    const issues = validateContentDepth(content, "requirements");
    expect(issues.some((i) => i.message.includes("F-xxx"))).toBe(true);
  });

  it("warns when no NFR-xxx present", () => {
    const content = "F-001\nF-002\nF-003";
    const issues = validateContentDepth(content, "requirements");
    expect(issues.some((i) => i.message.includes("NFR-xxx"))).toBe(true);
  });

  it("returns no issues with 3+ F-xxx and NFR-001", () => {
    const content = "F-001 ログイン\nF-002 ログアウト\nF-003 検索\nNFR-001 性能要件";
    const issues = validateContentDepth(content, "requirements");
    expect(issues).toHaveLength(0);
  });
});

describe("validateContentDepth — test-spec", () => {
  it("warns when fewer than 3 test case IDs present", () => {
    const content = "## テストケース\nUT-001 ログインテスト\nIT-002 結合テスト";
    const issues = validateContentDepth(content, "test-spec");
    expect(issues.some((i) => i.message.includes("UT/IT/ST-xxx"))).toBe(true);
  });

  it("returns no issues with 3+ test case IDs", () => {
    const content = "UT-001 ログイン\nIT-002 結合\nST-003 システム";
    const issues = validateContentDepth(content, "test-spec");
    expect(issues).toHaveLength(0);
  });
});

describe("validateContentDepth — functions-list", () => {
  it("warns when no F-xxx row in table", () => {
    const content = "## 機能一覧\n| 大分類 | 機能名 |\n| 商品管理 | 商品一覧 |";
    const issues = validateContentDepth(content, "functions-list");
    expect(issues.some((i) => i.message.includes("F-xxx"))).toBe(true);
  });

  it("returns no issues when F-001 present in table", () => {
    const content = "## 機能一覧\n| F-001 | 商品登録 | 新規登録 |";
    const issues = validateContentDepth(content, "functions-list");
    expect(issues).toHaveLength(0);
  });
});

describe("validateContentDepth — doc type with no rules", () => {
  it("returns empty array for overview (no rules defined)", () => {
    const issues = validateContentDepth("any content", "overview");
    expect(issues).toHaveLength(0);
  });

  it("returns empty array for detail-design (no rules defined)", () => {
    const issues = validateContentDepth("any content", "detail-design");
    expect(issues).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// validateDocument — integration: check_completeness flag behaviour
// ---------------------------------------------------------------------------

/** Minimal valid functions-list content (passes section + table checks) */
const VALID_FUNCTIONS_LIST = [
  "# 機能一覧",
  "## 改訂履歴",
  "| 版数 | 日付 | 変更内容 | 変更者 |",
  "| 1.0 | 2026-01-01 | 初版作成 | テスト |",
  "## 承認欄",
  "## 配布先",
  "## 用語集",
  "## 機能一覧",
  "| No. | 大分類 | 中分類 | 機能ID | 機能名 | 概要 | 処理分類 | 優先度 | 難易度 | 備考 |",
  "| 1 | 商品管理 | 商品登録 | SAL-001 | 商品登録 | 新規商品を登録する | 入力 | 高 | 中 | |",
].join("\n");

describe("validateDocument — backward compatibility (no check_completeness flag)", () => {
  it("does not return completeness issues when flag is absent", () => {
    // functions-list without F-xxx rows — would fail completeness check
    const result = validateDocument(VALID_FUNCTIONS_LIST, "functions-list");
    const completenessIssues = result.issues.filter((i) => i.type === "completeness");
    expect(completenessIssues).toHaveLength(0);
  });

  it("does not return completeness issues when flag is false", () => {
    const result = validateDocument(VALID_FUNCTIONS_LIST, "functions-list", undefined, { check_completeness: false });
    const completenessIssues = result.issues.filter((i) => i.type === "completeness");
    expect(completenessIssues).toHaveLength(0);
  });
});

describe("validateDocument — check_completeness: true", () => {
  it("returns completeness warning for functions-list missing F-xxx rows", () => {
    const result = validateDocument(VALID_FUNCTIONS_LIST, "functions-list", undefined, { check_completeness: true });
    const completenessIssues = result.issues.filter((i) => i.type === "completeness");
    expect(completenessIssues.length).toBeGreaterThan(0);
    expect(completenessIssues[0].severity).toBe("warning");
  });

  it("valid field remains true when only completeness warnings (no errors)", () => {
    // VALID_FUNCTIONS_LIST passes all section/table checks but lacks F-xxx
    const result = validateDocument(VALID_FUNCTIONS_LIST, "functions-list", undefined, { check_completeness: true });
    // All completeness issues are warnings — valid should still be true
    expect(result.valid).toBe(true);
  });

  it("returns no completeness issues for functions-list with F-xxx row", () => {
    const content = VALID_FUNCTIONS_LIST.replace(
      "| 1 | 商品管理 | 商品登録 | SAL-001 | 商品登録 | 新規商品を登録する | 入力 | 高 | 中 | |",
      "| 1 | 商品管理 | 商品登録 | F-001 | 商品登録 | 新規商品を登録する | 入力 | 高 | 中 | |"
    );
    const result = validateDocument(content, "functions-list", undefined, { check_completeness: true });
    const completenessIssues = result.issues.filter((i) => i.type === "completeness");
    expect(completenessIssues).toHaveLength(0);
  });
});
