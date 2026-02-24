import { describe, it, expect } from "@jest/globals";
import { extractIds, extractAllIds, extractIdsByType } from "../../src/lib/id-extractor.js";
import { deriveUpstreamIdTypes } from "../../src/lib/cross-ref-linker.js";

describe("extractIds", () => {
  it("extracts standard IDs grouped by type", () => {
    const content = `
## 機能要件
- REQ-001: ユーザー認証
- REQ-002: 商品検索
- F-001: ログイン機能
- SCR-001: ログイン画面
`;
    const result = extractIds(content);
    expect(result.get("REQ")).toEqual(["REQ-001", "REQ-002"]);
    expect(result.get("F")).toEqual(["F-001"]);
    expect(result.get("SCR")).toEqual(["SCR-001"]);
  });

  it("deduplicates repeated IDs", () => {
    const content = "REQ-001 maps to REQ-001 and REQ-002";
    const result = extractIds(content);
    expect(result.get("REQ")).toEqual(["REQ-001", "REQ-002"]);
  });

  it("returns empty map for content with no IDs", () => {
    const result = extractIds("No IDs here, just plain text.");
    expect(result.size).toBe(0);
  });

  it("extracts test IDs (UT, IT, ST, UAT)", () => {
    const content = "UT-001, IT-001, ST-001, UAT-001";
    const result = extractIds(content);
    expect(result.get("UT")).toEqual(["UT-001"]);
    expect(result.get("IT")).toEqual(["IT-001"]);
    expect(result.get("ST")).toEqual(["ST-001"]);
    expect(result.get("UAT")).toEqual(["UAT-001"]);
  });
});

describe("extractAllIds", () => {
  it("extracts custom-prefix IDs", () => {
    const content = "SAL-001, ACC-002, USR-003";
    const result = extractAllIds(content);
    expect(result.has("SAL-001")).toBe(true);
    expect(result.has("ACC-002")).toBe(true);
    expect(result.has("USR-003")).toBe(true);
  });
});

describe("extractIds — OTHER bucket", () => {
  it("puts custom prefix SAL-001 in OTHER bucket", () => {
    const result = extractIds("REQ-001 SAL-001 ACC-002");
    expect(result.get("REQ")).toContain("REQ-001");
    expect(result.get("OTHER")).toContain("SAL-001");
    expect(result.get("OTHER")).toContain("ACC-002");
  });

  it("does not put known prefixes in OTHER bucket", () => {
    const result = extractIds("REQ-001 F-002 SCR-003");
    expect(result.has("OTHER")).toBe(false);
  });
});

describe("deriveUpstreamIdTypes", () => {
  it("includes TP and TS for ut-spec", () => {
    const prefixes = deriveUpstreamIdTypes("ut-spec");
    expect(prefixes).toContain("TP");
    expect(prefixes).toContain("TS");
  });

  it("includes F and REQ for detail-design", () => {
    const prefixes = deriveUpstreamIdTypes("detail-design");
    expect(prefixes).toContain("F");
    expect(prefixes).toContain("REQ");
  });

  it("returns override for nfr (NFR, REQ)", () => {
    const overrides = { nfr: ["NFR", "REQ"] };
    const prefixes = deriveUpstreamIdTypes("nfr", overrides);
    expect(prefixes).toEqual(["NFR", "REQ"]);
  });

  it("does not include SEC for security-design when overridden", () => {
    const overrides = { "security-design": ["API", "NFR", "REQ", "SCR", "TBL"] };
    const prefixes = deriveUpstreamIdTypes("security-design", overrides);
    expect(prefixes).not.toContain("SEC");
  });

  it("returns empty array for requirements (no upstream)", () => {
    const prefixes = deriveUpstreamIdTypes("requirements");
    expect(prefixes).toEqual([]);
  });
});

describe("extractIdsByType", () => {
  it("extracts only IDs of specified type", () => {
    const content = "REQ-001, F-001, REQ-002, SCR-001";
    const result = extractIdsByType(content, "REQ");
    expect(result).toEqual(["REQ-001", "REQ-002"]);
  });

  it("returns empty array when type not found", () => {
    const result = extractIdsByType("REQ-001, F-001", "TBL");
    expect(result).toEqual([]);
  });
});
