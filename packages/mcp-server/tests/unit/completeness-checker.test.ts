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

  it("returns no issues with 3+ UT case IDs and complete content", () => {
    const content = "UT-001 ログイン 正常系 期待結果: 成功\nUT-002 検索 異常系 期待結果: エラー\nUT-003 レポート 境界値 期待結果: 表示";
    const issues = validateContentDepth(content, "ut-spec");
    expect(issues).toHaveLength(0);
  });
});

describe("validateContentDepth — functions-list", () => {
  /** Full valid content with all 6 rules satisfied */
  const FULL_VALID = [
    "## 機能一覧",
    "| F-001 | 商品登録 | REQ-001 |入力|高|",
    "| F-002 | 商品検索 | REQ-002 |照会|中|",
    "| F-003 | 在庫管理 | REQ-003 |バッチ|低|",
    "| F-004 | 帳票出力 | REQ-004 |帳票|高|",
    "| F-005 | API連携 | REQ-005 |API|中|",
  ].join("\n");

  it("warns when no function ID row in table", () => {
    const content = "## 機能一覧\n| 大分類 | 機能名 |\n| 商品管理 | 商品一覧 |";
    const issues = validateContentDepth(content, "functions-list");
    expect(issues.some((i) => i.message.includes("F-xxx") || i.message.includes("カスタムプレフィックス"))).toBe(true);
  });

  it("returns no issues with full valid functions-list content", () => {
    const issues = validateContentDepth(FULL_VALID, "functions-list");
    expect(issues).toHaveLength(0);
  });

  it("accepts custom-prefix IDs (SAL-001) in completeness check", () => {
    const content = [
      "| SAL-001 | 見積作成 | REQ-001 |入力|高|",
      "| SAL-002 | 見積検索 | REQ-002 |照会|中|",
      "| SAL-003 | 受注登録 | REQ-003 |入力|高|",
      "| SAL-004 | 受注検索 | REQ-004 |照会|低|",
      "| SAL-005 | 出荷管理 | REQ-005 |バッチ|中|",
    ].join("\n");
    const issues = validateContentDepth(content, "functions-list");
    // function table row check should pass with custom prefix
    expect(issues.some((i) => i.message.includes("カスタムプレフィックス"))).toBe(false);
  });

  it("validates 処理分類 enum — rejects invalid values", () => {
    const content = [
      "| F-001 | 商品登録 | REQ-001 |無効|高|",
      "| F-002 | 商品検索 | REQ-002 |無効|中|",
      "| F-003 | 在庫管理 | REQ-003 |無効|低|",
      "| F-004 | 帳票出力 | REQ-004 |無効|高|",
      "| F-005 | API連携 | REQ-005 |無効|中|",
    ].join("\n");
    const issues = validateContentDepth(content, "functions-list");
    expect(issues.some((i) => i.message.includes("処理分類"))).toBe(true);
  });

  it("validates 処理分類 enum — accepts new types (API, イベント, スケジューラ, Webhook)", () => {
    const content = [
      "| F-001 | API連携 | REQ-001 |API|高|",
      "| F-002 | イベント処理 | REQ-002 |イベント|中|",
      "| F-003 | スケジュール | REQ-003 |スケジューラ|低|",
      "| F-004 | Webhook受信 | REQ-004 |Webhook|高|",
      "| F-005 | データ入力 | REQ-005 |入力|中|",
    ].join("\n");
    const issues = validateContentDepth(content, "functions-list");
    expect(issues.some((i) => i.message.includes("処理分類"))).toBe(false);
  });

  it("validates 優先度 enum presence", () => {
    const content = [
      "| F-001 | 商品登録 | REQ-001 |入力||",
      "| F-002 | 商品検索 | REQ-002 |照会||",
      "| F-003 | 在庫管理 | REQ-003 |バッチ||",
      "| F-004 | 帳票出力 | REQ-004 |帳票||",
      "| F-005 | API連携 | REQ-005 |API||",
    ].join("\n");
    const issues = validateContentDepth(content, "functions-list");
    expect(issues.some((i) => i.message.includes("優先度"))).toBe(true);
  });

  it("detects duplicate function IDs", () => {
    const content = [
      "| F-001 | 商品登録 | REQ-001 |入力|高|",
      "| F-001 | 商品検索 | REQ-002 |照会|中|",
      "| F-003 | 在庫管理 | REQ-003 |バッチ|低|",
      "| F-004 | 帳票出力 | REQ-004 |帳票|高|",
      "| F-005 | API連携 | REQ-005 |API|中|",
    ].join("\n");
    const issues = validateContentDepth(content, "functions-list");
    expect(issues.some((i) => i.message.includes("重複"))).toBe(true);
  });

  it("warns when fewer than 5 functions", () => {
    const content = [
      "| F-001 | 商品登録 | REQ-001 |入力|高|",
      "| F-002 | 商品検索 | REQ-002 |照会|中|",
    ].join("\n");
    const issues = validateContentDepth(content, "functions-list");
    expect(issues.some((i) => i.message.includes("最低5つ"))).toBe(true);
  });

  it("warns when no REQ-xxx cross-reference", () => {
    const content = [
      "| F-001 | 商品登録 | |入力|高|",
      "| F-002 | 商品検索 | |照会|中|",
      "| F-003 | 在庫管理 | |バッチ|低|",
      "| F-004 | 帳票出力 | |帳票|高|",
      "| F-005 | API連携 | |API|中|",
    ].join("\n");
    const issues = validateContentDepth(content, "functions-list");
    expect(issues.some((i) => i.message.includes("REQ-xxx"))).toBe(true);
  });

  it("validates required columns now include 処理分類 and 優先度 (7 columns) — ja", () => {
    // Use validateDocument's table structure check (not content depth)
    const content = [
      "# 機能一覧",
      "## 改訂履歴",
      "| 版数 | 日付 | 変更内容 | 変更者 |",
      "| 1.0 | 2026-01-01 | 初版作成 | テスト |",
      "## 承認欄",
      "## 配布先",
      "## 用語集",
      "## 機能一覧",
      "| 大分類 | 中分類 | 機能ID | 機能名 | 関連要件ID |",
    ].join("\n");
    // Missing 処理分類 and 優先度 → should flag missing columns (ja lang)
    const result = validateDocument(content, "functions-list", undefined, undefined, "ja");
    const colIssues = result.issues.filter((i) => i.type === "missing_column");
    expect(colIssues.some((i) => i.message.includes("処理分類") || i.message.includes("優先度"))).toBe(true);
  });
});

describe("validateContentDepth — test-plan", () => {
  it("warns when fewer than 3 TP-xxx IDs present", () => {
    const content = "## テスト戦略\nTP-001 単体テスト\nTP-002 結合テスト";
    const issues = validateContentDepth(content, "test-plan");
    expect(issues.some((i) => i.message.includes("TP-xxx"))).toBe(true);
  });

  it("returns no issues with 3+ TP-xxx IDs and complete content", () => {
    const content = "TP-001 単体テスト\nTP-002 結合テスト\nTP-003 システムテスト\n要件定義書に基づくテスト対象\nカバレッジ目標: 80%";
    const issues = validateContentDepth(content, "test-plan");
    expect(issues).toHaveLength(0);
  });
});

describe("validateContentDepth — it-spec", () => {
  // Complete enriched IT spec satisfying all rules (3 existing + 4 new).
  const COMPLETE = [
    "## 結合テストケース",
    "| No. | テストケースID | モジュール/サブモジュール | テストケース名 | テスト対象 | テスト観点 | 前提条件 | テスト手順 | テストデータ | 期待結果 | 優先度 | リスクレベル | 実行結果 | 判定 | デフェクトID | 備考 |",
    "| 1 | IT-001 | 認証 | ログイン正常系 | API-001 | 正常系/API契約検証 | 前提 | 1.手順 | メール: test_user_01@domain.com | 1.成功 | 高 | 高 | | | | |",
    "| 2 | IT-002 | 認証 | 不正入力 | API-001 | 異常系/同値分割 | 前提 | 1.手順 | 顧客コード: KH-2026-0012 | エラー | 中 | 中 | | | | |",
    "| 3 | IT-003 | 注文 | 境界値 | API-002 | 境界値/エッジ | 前提 | 1.手順 | パスワード: 5文字 | 結果 | 低 | 低 | | | | |",
  ].join("\n");

  it("returns no issues for a complete enriched IT spec", () => {
    const issues = validateContentDepth(COMPLETE, "it-spec");
    expect(issues).toHaveLength(0);
  });

  it("warns when リスクレベル missing", () => {
    const issues = validateContentDepth(COMPLETE.replace("リスクレベル", ""), "it-spec");
    expect(issues.some((i) => i.message.includes("リスクレベル"))).toBe(true);
  });

  it("warns when 優先度 missing", () => {
    const issues = validateContentDepth(COMPLETE.replace("優先度", ""), "it-spec");
    expect(issues.some((i) => i.message.includes("優先度"))).toBe(true);
  });

  it("warns when coverage variety insufficient (only 正常系)", () => {
    const oneKind = COMPLETE.replace(/異常系|境界値|エッジ/g, "正常系");
    const issues = validateContentDepth(oneKind, "it-spec");
    expect(issues.some((i) => i.message.includes("網羅性"))).toBe(true);
  });

  it("warns when テストデータ is generic (no concrete values)", () => {
    const generic = [
      "## 結合テストケース",
      "| No. | テストケースID | テスト観点 | テストデータ | 優先度 | リスクレベル |",
      "| 1 | IT-001 | 正常系/異常系 | 有効なメール | 高 | 高 |",
      "| 2 | IT-002 | 境界値 | 正しいコード | 中 | 中 |",
    ].join("\n");
    const issues = validateContentDepth(generic, "it-spec");
    expect(issues.some((i) => i.message.includes("具体"))).toBe(true);
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

  it("returns no issues with complete operation-design content", () => {
    const content = [
      "OP-001 再起動\nOP-002 バックアップ\nOP-003 ログ確認",
      "| SLA項目 | 目標値 |\n| 稼働率 | 99.9% |",
      "RPO: 1時間\nRTO: 4時間",
      "| 監視対象 | メトリクス | 閾値(警告) |\n| CPU | 使用率 | 80% |",
      "| ジョブID | ジョブ名 |\n| JOB-001 | 日次バックアップ |",
      "NFR-001 可用性",
    ].join("\n");
    const issues = validateContentDepth(content, "operation-design");
    expect(issues).toHaveLength(0);
  });

  it("warns on SLA vague terms", () => {
    const content = [
      "OP-001 再起動\nOP-002 バックアップ\nOP-003 ログ確認",
      "| SLA項目 | 目標値 |\n| 稼働率 | 高い |",
      "RPO: 1時間\nRTO: 4時間",
      "| 監視対象 | メトリクス |\n| CPU | 使用率 |",
      "| ジョブID | ジョブ名 |\n| JOB-001 | バッチ |",
      "NFR-001",
    ].join("\n");
    const issues = validateContentDepth(content, "operation-design");
    expect(issues.some(i => i.message.includes("曖昧"))).toBe(true);
  });

  it("warns when RPO/RTO missing", () => {
    const content = [
      "OP-001 再起動\nOP-002 バックアップ\nOP-003 ログ確認",
      "| SLA項目 | 目標値 |\n| 稼働率 | 99.9% |",
      "バックアップ: 毎日実施",
      "| 監視対象 | メトリクス |\n| CPU | 使用率 |",
      "| ジョブID | ジョブ名 |\n| JOB-001 | バッチ |",
      "NFR-001",
    ].join("\n");
    const issues = validateContentDepth(content, "operation-design");
    expect(issues.some(i => i.message.includes("RPO"))).toBe(true);
  });
});

describe("validateContentDepth — migration-design", () => {
  it("warns when fewer than 3 MIG-xxx IDs present", () => {
    const content = "## データ移行計画\nMIG-001 ユーザーデータ\nMIG-002 商品データ";
    const issues = validateContentDepth(content, "migration-design");
    expect(issues.some((i) => i.message.includes("MIG-xxx"))).toBe(true);
  });

  it("returns no issues with 3+ MIG-xxx IDs and complete content", () => {
    const content = "MIG-001 ユーザー\nMIG-002 商品\nMIG-003 注文\n移行元: 旧システム\nデータ量: 10万件";
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

/** Minimal valid functions-list in Japanese (passes section + table checks with lang="ja") */
const VALID_FUNCTIONS_LIST_JA = [
  "# 機能一覧",
  "## 改訂履歴",
  "| 版数 | 日付 | 変更内容 | 変更者 |",
  "| 1.0 | 2026-01-01 | 初版作成 | テスト |",
  "## 承認欄",
  "## 配布先",
  "## 用語集",
  "## 機能一覧",
  "| No. | 大分類 | 中分類 | 機能ID | 機能名 | 概要 | 関連要件ID | 処理分類 | 優先度 | 難易度 | 備考 |",
  "| 1 | 商品管理 | 商品登録 | SAL-001 | 商品登録 | 新規 | REQ-001 | 入力 | 高 | 中 | |",
].join("\n");

/** Minimal valid functions-list in Vietnamese (passes section + table checks with default lang="vi") */
const VALID_FUNCTIONS_LIST_VI = [
  "# Danh sách chức năng",
  "## Lịch sử sửa đổi",
  "| Phiên bản | Ngày | Nội dung thay đổi | Người thay đổi |",
  "| 1.0 | 2026-01-01 | Tạo ban đầu | Kiểm tra |",
  "## Phê duyệt",
  "## Nơi phân phối",
  "## Thuật ngữ",
  "## Danh sách chức năng",
  "| STT | Phân loại lớn | Phân loại vừa | ID chức năng | Tên chức năng | Tổng quan | ID yêu cầu liên quan | Phân loại xử lý | Độ ưu tiên | Độ phức tạp | Ghi chú |",
  "| 1 | Quản lý sản phẩm | Đăng ký sản phẩm | SAL-001 | Đăng ký sản phẩm | Mới | REQ-001 | Nhập liệu | Cao | Trung | |",
].join("\n");

describe("validateDocument — backward compatibility (no check_completeness flag)", () => {
  it("does not return completeness issues when flag is absent (ja)", () => {
    // functions-list without F-xxx rows — would fail completeness check
    const result = validateDocument(VALID_FUNCTIONS_LIST_JA, "functions-list", undefined, undefined, "ja");
    const completenessIssues = result.issues.filter((i) => i.type === "completeness");
    expect(completenessIssues).toHaveLength(0);
  });

  it("does not return completeness issues when flag is false (vi)", () => {
    const result = validateDocument(VALID_FUNCTIONS_LIST_VI, "functions-list", undefined, { check_completeness: false }, "vi");
    const completenessIssues = result.issues.filter((i) => i.type === "completeness");
    expect(completenessIssues).toHaveLength(0);
  });
});

describe("validateDocument — check_completeness: true", () => {
  it("returns completeness warning for functions-list missing F-xxx rows (ja)", () => {
    const result = validateDocument(VALID_FUNCTIONS_LIST_JA, "functions-list", undefined, { check_completeness: true }, "ja");
    const completenessIssues = result.issues.filter((i) => i.type === "completeness");
    expect(completenessIssues.length).toBeGreaterThan(0);
    expect(completenessIssues[0].severity).toBe("warning");
  });

  it("valid field remains true when only completeness warnings (no errors) (ja)", () => {
    // VALID_FUNCTIONS_LIST_JA passes all section/table checks (lang=ja) but lacks F-xxx
    const result = validateDocument(VALID_FUNCTIONS_LIST_JA, "functions-list", undefined, { check_completeness: true }, "ja");
    // All completeness issues are warnings — valid should still be true
    expect(result.valid).toBe(true);
  });

  it("returns no completeness issues for functions-list with sufficient F-xxx rows (ja)", () => {
    const content = [
      "# 機能一覧",
      "## 改訂履歴",
      "| 版数 | 日付 | 変更内容 | 変更者 |",
      "| 1.0 | 2026-01-01 | 初版作成 | テスト |",
      "## 承認欄",
      "## 配布先",
      "## 用語集",
      "## 機能一覧",
      "| No. | 大分類 | 中分類 | 機能ID | 機能名 | 概要 | 関連要件ID | 処理分類 | 優先度 | 難易度 | 備考 |",
      "| 1 | 商品管理 | 商品登録 | F-001 | 商品登録 | 新規 | REQ-001 | 入力 | 高 | 中 | |",
      "| 2 | 商品管理 | 商品検索 | F-002 | 商品検索 | 検索 | REQ-002 | 照会 | 中 | 低 | |",
      "| 3 | 在庫管理 | 在庫確認 | F-003 | 在庫確認 | 確認 | REQ-003 | 照会 | 高 | 中 | |",
      "| 4 | 帳票管理 | 帳票出力 | F-004 | 帳票出力 | 出力 | REQ-004 | 帳票 | 中 | 低 | |",
      "| 5 | バッチ処理 | データ連携 | F-005 | データ連携 | 連携 | REQ-005 | バッチ | 低 | 低 | |",
    ].join("\n");
    const result = validateDocument(content, "functions-list", undefined, { check_completeness: true }, "ja");
    const completenessIssues = result.issues.filter((i) => i.type === "completeness");
    expect(completenessIssues).toHaveLength(0);
  });

  it("returns no missing_section/missing_column issues for a well-formed vi functions-list", () => {
    // validateContentDepth checks ID patterns (language-agnostic) not headings
    // so we verify structural+table validation pass for vi, not full completeness
    const content = VALID_FUNCTIONS_LIST_VI;
    const result = validateDocument(content, "functions-list", undefined, undefined, "vi");
    const structureIssues = result.issues.filter(
      (i) => i.type === "missing_section" || i.type === "missing_column"
    );
    expect(structureIssues).toHaveLength(0);
    expect(result.valid).toBe(true);
  });
});
