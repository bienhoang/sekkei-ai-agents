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
      test: (c) => (c.match(/F-\d{3}/g) || []).length >= 3,
      message: "要件定義書: 機能要件が3つ以上必要です (F-xxx)",
    },
    {
      check: "NFR entry",
      test: (c) => /NFR-\d{3}/.test(c),
      message: "要件定義書: 非機能要件が1つ以上必要です (NFR-xxx)",
    },
  ],
  "test-spec": [
    {
      check: "test cases",
      test: (c) => (c.match(/(?:UT|IT|ST)-\d{3}/g) || []).length >= 3,
      message: "テスト仕様書: テストケースが3つ以上必要です (UT/IT/ST-xxx)",
    },
  ],
  "functions-list": [
    {
      check: "function table row",
      test: (c) => /\|\s*F-\d{3}/.test(c),
      message: "機能一覧: 機能テーブルにF-xxxが必要です",
    },
  ],
};
