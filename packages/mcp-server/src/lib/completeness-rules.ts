/**
 * Content depth rules for completeness checking per document type.
 * Each rule tests whether the document contains required identifiers/tables.
 */
import type { DocType } from "../types/documents.js";

export interface DepthRule {
  check: string;
  test: (content: string) => boolean;
  message: string;
}

export const CONTENT_DEPTH_RULES: Partial<Record<DocType, DepthRule[]>> = {
  "basic-design": [
    {
      check: "screen table",
      test: (c) => /\|\s*SCR-\d+/.test(c),
      message: "基本設計書: 画面一覧テーブルにSCR-xxxが必要です",
    },
    {
      check: "DB table",
      test: (c) => /\|\s*TBL-\d+/.test(c),
      message: "基本設計書: テーブル一覧にTBL-xxxが必要です",
    },
    {
      check: "API table",
      test: (c) => /\|\s*API-\d+/.test(c),
      message: "基本設計書: API一覧にAPI-xxxが必要です",
    },
  ],
  "requirements": [
    {
      check: "functional requirements",
      test: (c) => (c.match(/REQ-\d{3}/g) || []).length >= 3,
      message: "要件定義書: 機能要件が3つ以上必要です (REQ-xxx)",
    },
    {
      check: "NFR entry",
      test: (c) => /NFR-\d{3}/.test(c),
      message: "要件定義書: 非機能要件が1つ以上必要です (NFR-xxx)",
    },
    {
      check: "NFR vague terms",
      test: (c: string) => {
        // Extract NFR table rows (lines containing NFR-xxx)
        const nfrRows = c.split("\n").filter((l) => /NFR-\d{3}/.test(l));
        const vaguePattern = /高速|十分|適切|高い|良好/;
        return !nfrRows.some((row) => vaguePattern.test(row));
      },
      message: "要件定義書: NFR目標値に曖昧な表現があります（高速・十分・適切・高い・良好は数値に置換してください）",
    },
    {
      check: "NFR numeric targets",
      test: (c: string) => {
        const nfrRows = c.split("\n").filter((l) => /NFR-\d{3}/.test(l));
        if (nfrRows.length === 0) return true; // no NFR rows to check
        // At least 80% of NFR rows should contain a numeric target
        const withNumbers = nfrRows.filter((row) => /\d+(\.\d+)?[%秒ms時間件人日回]/.test(row));
        return withNumbers.length >= nfrRows.length * 0.8;
      },
      message: "要件定義書: NFR目標値に数値が不足しています（例: 99.9%, 2秒以内, 1000件）",
    },
    {
      check: "traceability verification method",
      test: (c: string) => {
        const reqRows = c.split("\n").filter((l) => /REQ-\d{3}/.test(l));
        if (reqRows.length === 0) return true;
        // Check that most REQ rows have a 検証方法 value (UT/IT/ST/UAT)
        const withVerification = reqRows.filter((row) => /UT|IT|ST|UAT/.test(row));
        return withVerification.length >= reqRows.length * 0.8;
      },
      message: "要件定義書: 検証方法（UT/IT/ST/UAT）が不足しています",
    },
  ],
  nfr: [
    {
      check: "NFR entries",
      test: (c: string) => (c.match(/NFR-\d{3}/g) || []).length >= 3,
      message: "非機能要件定義書: NFR-xxxが3つ以上必要です",
    },
  ],
  "security-design": [
    {
      check: "security entries",
      test: (c: string) => /\|\s*SEC-\d+/.test(c),
      message: "セキュリティ設計書: SEC-xxxが必要です",
    },
  ],
  "detail-design": [
    {
      check: "class table",
      test: (c: string) => /\|\s*CLS-\d+/.test(c),
      message: "詳細設計書: クラス一覧テーブルにCLS-xxxが必要です",
    },
    {
      check: "screen reference",
      test: (c: string) => /SCR-\d+/.test(c),
      message: "詳細設計書: 画面設計詳細にSCR-xxx参照が必要です",
    },
    {
      check: "table reference",
      test: (c: string) => /TBL-\d+/.test(c),
      message: "詳細設計書: DB詳細設計にTBL-xxx参照が必要です",
    },
    {
      check: "API reference",
      test: (c: string) => /API-\d+/.test(c),
      message: "詳細設計書: API詳細仕様にAPI-xxx参照が必要です",
    },
  ],
  "ut-spec": [
    {
      check: "UT cases",
      test: (c: string) => (c.match(/UT-\d{3}/g) || []).length >= 3,
      message: "単体テスト仕様書: UTケースが3つ以上必要です",
    },
  ],
  "it-spec": [
    {
      check: "IT cases",
      test: (c: string) => (c.match(/IT-\d{3}/g) || []).length >= 3,
      message: "結合テスト仕様書: ITケースが3つ以上必要です",
    },
  ],
  "st-spec": [
    {
      check: "ST cases",
      test: (c: string) => (c.match(/ST-\d{3}/g) || []).length >= 3,
      message: "システムテスト仕様書: STケースが3つ以上必要です",
    },
  ],
  "uat-spec": [
    {
      check: "UAT cases",
      test: (c: string) => (c.match(/UAT-\d{3}/g) || []).length >= 3,
      message: "受入テスト仕様書: UATケースが3つ以上必要です",
    },
  ],
  "functions-list": [
    {
      check: "function table row",
      test: (c) => /\|\s*[A-Z]{1,5}-\d{3}/.test(c),
      message: "機能一覧: 機能テーブルにF-xxx（またはカスタムプレフィックス）が必要です",
    },
    {
      check: "processing type enum",
      test: (c) => {
        const rows = c.match(/\|\s*(入力|照会|帳票|バッチ|API|イベント|スケジューラ|Webhook)\s*\|/g);
        return rows !== null && rows.length > 0;
      },
      message: "機能一覧: 処理分類は有効な値が必要です",
    },
    {
      check: "minimum function count",
      test: (c) => {
        const NON_FUNC = /^(REQ|NFR|SCR|TBL|API|CLS|SEC|PP|TP|EV|OP|MIG|PG|UT|IT|ST|UAT)-/;
        const all = c.match(/[A-Z]{1,5}-\d{3}/g) || [];
        return all.filter(id => !NON_FUNC.test(id)).length >= 5;
      },
      message: "機能一覧: 最低5つの機能が必要です",
    },
    {
      check: "unique function IDs",
      test: (c) => {
        const NON_FUNC = /^(REQ|NFR|SCR|TBL|API|CLS|SEC|PP|TP|EV|OP|MIG|PG|UT|IT|ST|UAT)-/;
        const all = c.match(/\b[A-Z]{1,5}-\d{3,4}\b/g) || [];
        const funcIds = all.filter(id => !NON_FUNC.test(id));
        return funcIds.length === new Set(funcIds).size;
      },
      message: "機能一覧: 重複した機能IDがあります",
    },
    {
      check: "REQ cross-reference",
      test: (c) => /REQ-\d{3}/.test(c),
      message: "機能一覧: REQ-xxx参照が必要です",
    },
    {
      check: "priority enum",
      test: (c) => /\|\s*(高|中|低)\s*\|/.test(c),
      message: "機能一覧: 優先度は高/中/低が必要です",
    },
  ],
  "project-plan": [
    {
      check: "PP entries",
      test: (c: string) => (c.match(/PP-\d{3}/g) || []).length >= 3,
      message: "プロジェクト計画書: WBSにPP-xxxが3つ以上必要です",
    },
  ],
  "test-plan": [
    {
      check: "TP entries",
      test: (c: string) => (c.match(/TP-\d{3}/g) || []).length >= 3,
      message: "テスト計画書: テスト戦略にTP-xxxが3つ以上必要です",
    },
  ],
  "test-evidence": [
    {
      check: "evidence entry",
      test: (c) => /\|\s*EV-\d{3}/.test(c),
      message: "テストエビデンス: エビデンスエントリにEV-xxxが必要です",
    },
  ],
  "screen-design": [
    {
      check: "screen table",
      test: (c) => /\|\s*SCR-\d+/.test(c),
      message: "画面設計書: 画面一覧テーブルにSCR-xxxが必要です",
    },
  ],
  "operation-design": [
    {
      check: "OP entries",
      test: (c: string) => (c.match(/OP-\d{3}/g) || []).length >= 3,
      message: "運用設計書: 障害対応手順にOP-xxxが3つ以上必要です",
    },
  ],
  "migration-design": [
    {
      check: "MIG entries",
      test: (c: string) => (c.match(/MIG-\d{3}/g) || []).length >= 3,
      message: "移行設計書: データ移行計画にMIG-xxxが3つ以上必要です",
    },
  ],
  "crud-matrix": [
    {
      check: "F-xxx rows",
      test: (c: string) => /\|\s*F-\d+/.test(c),
      message: "CRUD図: 機能行にF-xxxが必要です",
    },
    {
      check: "TBL-xxx columns",
      test: (c: string) => /TBL-\d+/.test(c),
      message: "CRUD図: テーブル列にTBL-xxxが必要です",
    },
  ],
  "traceability-matrix": [
    {
      check: "REQ-xxx rows",
      test: (c: string) => /\|\s*REQ-\d+/.test(c),
      message: "トレーサビリティマトリックス: 要件行にREQ-xxxが必要です",
    },
  ],
  "sitemap": [
    {
      check: "PG entries",
      test: (c: string) => (c.match(/PG-\d{3}/g) || []).length >= 3,
      message: "サイトマップ: ページ一覧にPG-xxxが3つ以上必要です",
    },
  ],
};
