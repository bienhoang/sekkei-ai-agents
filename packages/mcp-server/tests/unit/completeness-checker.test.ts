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
  it("warns when fewer than 3 REQ-xxx IDs present", () => {
    const content = "## 機能要件\nREQ-001 ログイン\nREQ-002 ログアウト";
    const issues = validateContentDepth(content, "requirements");
    expect(issues.some((i) => i.message.includes("REQ-xxx"))).toBe(true);
  });

  it("warns when no NFR-xxx present", () => {
    const content = "REQ-001\nREQ-002\nREQ-003";
    const issues = validateContentDepth(content, "requirements");
    expect(issues.some((i) => i.message.includes("NFR-xxx"))).toBe(true);
  });

  it("returns no issues with 3+ REQ-xxx and NFR-001 with numeric target", () => {
    const content = "| REQ-001 | ログイン | UT |\n| REQ-002 | ログアウト | IT |\n| REQ-003 | 検索 | ST |\n| NFR-001 | 性能 | 応答時間 | 2秒以内 |";
    const issues = validateContentDepth(content, "requirements");
    expect(issues).toHaveLength(0);
  });
});

describe("validateContentDepth — ut-spec", () => {
  it("warns when fewer than 3 UT case IDs present", () => {
    const content = "## テストケース\nUT-001 ログインテスト\nUT-002 検索テスト";
    const issues = validateContentDepth(content, "ut-spec");
    expect(issues.some((i) => i.message.includes("UT"))).toBe(true);
  });

  it("returns no issues with 3+ UT case IDs", () => {
    const content = "UT-001 ログイン\nUT-002 検索\nUT-003 レポート";
    const issues = validateContentDepth(content, "ut-spec");
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

describe("validateContentDepth — test-plan", () => {
  it("warns when fewer than 3 TP-xxx IDs present", () => {
    const content = "## テスト戦略\nTP-001 単体テスト\nTP-002 結合テスト";
    const issues = validateContentDepth(content, "test-plan");
    expect(issues.some((i) => i.message.includes("TP-xxx"))).toBe(true);
  });

  it("returns no issues with 3+ TP-xxx IDs", () => {
    const content = "TP-001 単体テスト\nTP-002 結合テスト\nTP-003 システムテスト";
    const issues = validateContentDepth(content, "test-plan");
    expect(issues).toHaveLength(0);
  });
});

describe("validateContentDepth — doc type with no rules", () => {
  it("returns warnings for crud-matrix missing F-xxx and TBL-xxx", () => {
    const issues = validateContentDepth("any content", "crud-matrix");
    expect(issues).toHaveLength(2);
    expect(issues[0].message).toContain("F-xxx");
    expect(issues[1].message).toContain("TBL-xxx");
  });

  it("returns warnings for detail-design missing all references", () => {
    const issues = validateContentDepth("any content", "detail-design");
    expect(issues).toHaveLength(4);
    expect(issues[0].message).toContain("CLS-xxx");
    expect(issues[1].message).toContain("SCR-xxx");
    expect(issues[2].message).toContain("TBL-xxx");
    expect(issues[3].message).toContain("API-xxx");
  });

  it("returns empty array for detail-design with all references", () => {
    const content = "| CLS-001 | LoginController | SCR-001 画面 | TBL-001 テーブル | API-001 認証 |";
    const issues = validateContentDepth(content, "detail-design");
    expect(issues).toHaveLength(0);
  });
});

describe("validateContentDepth — operation-design", () => {
  it("warns when fewer than 3 OP-xxx IDs present", () => {
    const content = "## 障害対応手順\nOP-001 サーバー再起動\nOP-002 バックアップ";
    const issues = validateContentDepth(content, "operation-design");
    expect(issues.some((i) => i.message.includes("OP-xxx"))).toBe(true);
  });

  it("returns no issues with 3+ OP-xxx IDs", () => {
    const content = "OP-001 再起動\nOP-002 バックアップ\nOP-003 ログ確認";
    const issues = validateContentDepth(content, "operation-design");
    expect(issues).toHaveLength(0);
  });
});

describe("validateContentDepth — migration-design", () => {
  it("warns when fewer than 3 MIG-xxx IDs present", () => {
    const content = "## データ移行計画\nMIG-001 ユーザーデータ\nMIG-002 商品データ";
    const issues = validateContentDepth(content, "migration-design");
    expect(issues.some((i) => i.message.includes("MIG-xxx"))).toBe(true);
  });

  it("returns no issues with 3+ MIG-xxx IDs", () => {
    const content = "MIG-001 ユーザー\nMIG-002 商品\nMIG-003 注文";
    const issues = validateContentDepth(content, "migration-design");
    expect(issues).toHaveLength(0);
  });
});

describe("validateContentDepth — traceability-matrix", () => {
  it("warns when no REQ-xxx rows in table", () => {
    const content = "## トレーサビリティ\n| 要件ID | SCR | API |";
    const issues = validateContentDepth(content, "traceability-matrix");
    expect(issues.some((i) => i.message.includes("REQ-xxx"))).toBe(true);
  });

  it("returns no issues when REQ-xxx present in table rows", () => {
    const content = "| REQ-001 | ○ | ○ |";
    const issues = validateContentDepth(content, "traceability-matrix");
    expect(issues).toHaveLength(0);
  });
});

describe("validateContentDepth — sitemap", () => {
  it("warns when fewer than 3 PG-xxx IDs present", () => {
    const content = "## ページ一覧\nPG-001 トップ\nPG-002 ログイン";
    const issues = validateContentDepth(content, "sitemap");
    expect(issues.some((i) => i.message.includes("PG-xxx"))).toBe(true);
  });

  it("returns no issues with 3+ PG-xxx IDs", () => {
    const content = "PG-001 トップ\nPG-002 ログイン\nPG-003 検索";
    const issues = validateContentDepth(content, "sitemap");
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
  "| No. | 大分類 | 中分類 | 機能ID | 機能名 | 概要 | 関連要件ID | 処理分類 | 優先度 | 難易度 | 備考 |",
  "| 1 | 商品管理 | 商品登録 | SAL-001 | 商品登録 | 新規商品を登録する | REQ-001 | 入力 | 高 | 中 | |",
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
      "| 1 | 商品管理 | 商品登録 | SAL-001 | 商品登録 | 新規商品を登録する | REQ-001 | 入力 | 高 | 中 | |",
      "| 1 | 商品管理 | 商品登録 | F-001 | 商品登録 | 新規商品を登録する | REQ-001 | 入力 | 高 | 中 | |"
    );
    const result = validateDocument(content, "functions-list", undefined, { check_completeness: true });
    const completenessIssues = result.issues.filter((i) => i.type === "completeness");
    expect(completenessIssues).toHaveLength(0);
  });
});
