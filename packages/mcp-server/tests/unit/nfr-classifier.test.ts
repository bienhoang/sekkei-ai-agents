import { describe, it, expect } from "@jest/globals";
import { classifyNfrContent, computeNfrCoverage } from "../../src/lib/nfr-classifier.js";

const SAMPLE_NFR = `
# 非機能要件定義書

## 可用性
- NFR-001 稼働率 99.9%
- NFR-002 計画停止 月4時間以内

## 性能・拡張性
- NFR-003 レスポンスタイム 200ms以内
- NFR-004 同時接続数 1000

## 運用・保守性
- NFR-005 ログ保存期間 90日
- NFR-006 バックアップ 日次

## 移行性
- NFR-007 旧システムからのデータ移行 3ヶ月以内

## セキュリティ
- NFR-008 認証 多要素認証
- NFR-009 暗号化 AES-256

## システム環境
- NFR-010 OS Windows Server 2022
`;

describe("classifyNfrContent — basic classification", () => {
  it("identifies all 6 IPA NFUG category sections", () => {
    const result = classifyNfrContent(SAMPLE_NFR);
    const categoryNames = result.map(c => c.categoryEn);
    expect(categoryNames).toContain("Availability");
    expect(categoryNames).toContain("Performance/Scalability");
    expect(categoryNames).toContain("Operability/Maintainability");
    expect(categoryNames).toContain("Migration");
    expect(categoryNames).toContain("Security");
    expect(categoryNames).toContain("System Environment");
  });

  it("extracts NFR IDs under 可用性 section", () => {
    const result = classifyNfrContent(SAMPLE_NFR);
    const avail = result.find(c => c.category === "可用性");
    expect(avail).toBeDefined();
    expect(avail!.nfrIds).toContain("NFR-001");
    expect(avail!.nfrIds).toContain("NFR-002");
  });

  it("extracts NFR IDs under 性能・拡張性 section", () => {
    const result = classifyNfrContent(SAMPLE_NFR);
    const perf = result.find(c => c.category === "性能・拡張性");
    expect(perf).toBeDefined();
    expect(perf!.nfrIds).toContain("NFR-003");
    expect(perf!.nfrIds).toContain("NFR-004");
  });

  it("extracts NFR IDs under セキュリティ section", () => {
    const result = classifyNfrContent(SAMPLE_NFR);
    const sec = result.find(c => c.category === "セキュリティ");
    expect(sec).toBeDefined();
    expect(sec!.nfrIds).toContain("NFR-008");
    expect(sec!.nfrIds).toContain("NFR-009");
  });

  it("does not mix IDs across categories", () => {
    const result = classifyNfrContent(SAMPLE_NFR);
    const avail = result.find(c => c.category === "可用性");
    expect(avail!.nfrIds).not.toContain("NFR-003");
    expect(avail!.nfrIds).not.toContain("NFR-008");
  });

  it("sets coverage to 0 by default", () => {
    const result = classifyNfrContent(SAMPLE_NFR);
    for (const cat of result) {
      expect(cat.coverage).toBe(0);
    }
  });
});

describe("classifyNfrContent — empty and missing content", () => {
  it("returns empty array for empty content", () => {
    const result = classifyNfrContent("");
    expect(result).toHaveLength(0);
  });

  it("returns only matched categories when some sections are absent", () => {
    const partial = `
# NFR
## 可用性
- NFR-001 稼働率 99.9%
## セキュリティ
- NFR-002 認証必須
`;
    const result = classifyNfrContent(partial);
    expect(result).toHaveLength(2);
    const labels = result.map(c => c.category);
    expect(labels).toContain("可用性");
    expect(labels).toContain("セキュリティ");
    expect(labels).not.toContain("移行性");
  });

  it("returns empty nfrIds when section has no NFR-xxx IDs", () => {
    const content = `
## 可用性
稼働率は高く維持する。具体的な数値は別途定義する。
`;
    const result = classifyNfrContent(content);
    const avail = result.find(c => c.category === "可用性");
    expect(avail).toBeDefined();
    expect(avail!.nfrIds).toHaveLength(0);
  });
});

describe("classifyNfrContent — ID deduplication and sorting", () => {
  it("deduplicates NFR IDs mentioned multiple times in a section", () => {
    const content = `
## 可用性
- NFR-001 稼働率 (see NFR-001 for details)
- NFR-002 停止時間
`;
    const result = classifyNfrContent(content);
    const avail = result.find(c => c.category === "可用性");
    const count001 = avail!.nfrIds.filter(id => id === "NFR-001").length;
    expect(count001).toBe(1);
  });

  it("returns IDs in sorted order", () => {
    const content = `
## 性能・拡張性
- NFR-010 キャパシティ
- NFR-003 レスポンス
- NFR-007 スケール
`;
    const result = classifyNfrContent(content);
    const perf = result.find(c => c.category === "性能・拡張性");
    expect(perf!.nfrIds).toEqual(["NFR-003", "NFR-007", "NFR-010"]);
  });
});

describe("computeNfrCoverage", () => {
  it("sets coverage to 100% when all IDs are traced", () => {
    const categories = [
      { category: "可用性", categoryEn: "Availability", nfrIds: ["NFR-001", "NFR-002"], coverage: 0 },
    ];
    const traced = new Set(["NFR-001", "NFR-002"]);
    const result = computeNfrCoverage(categories, traced);
    expect(result[0].coverage).toBe(100);
  });

  it("sets coverage to 50% when half the IDs are traced", () => {
    const categories = [
      { category: "可用性", categoryEn: "Availability", nfrIds: ["NFR-001", "NFR-002"], coverage: 0 },
    ];
    const traced = new Set(["NFR-001"]);
    const result = computeNfrCoverage(categories, traced);
    expect(result[0].coverage).toBe(50);
  });

  it("sets coverage to 0% when no IDs are traced", () => {
    const categories = [
      { category: "セキュリティ", categoryEn: "Security", nfrIds: ["NFR-008", "NFR-009"], coverage: 0 },
    ];
    const traced = new Set<string>();
    const result = computeNfrCoverage(categories, traced);
    expect(result[0].coverage).toBe(0);
  });

  it("sets coverage to 0 for categories with no IDs", () => {
    const categories = [
      { category: "移行性", categoryEn: "Migration", nfrIds: [], coverage: 0 },
    ];
    const traced = new Set(["NFR-001"]);
    const result = computeNfrCoverage(categories, traced);
    expect(result[0].coverage).toBe(0);
  });

  it("does not mutate input categories", () => {
    const categories = [
      { category: "可用性", categoryEn: "Availability", nfrIds: ["NFR-001"], coverage: 0 },
    ];
    const traced = new Set(["NFR-001"]);
    computeNfrCoverage(categories, traced);
    expect(categories[0].coverage).toBe(0);
  });
});
