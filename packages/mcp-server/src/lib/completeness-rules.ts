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
      test: (c) => /\|\s*F-\d{3}/.test(c),
      message: "機能一覧: 機能テーブルにF-xxxが必要です",
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
