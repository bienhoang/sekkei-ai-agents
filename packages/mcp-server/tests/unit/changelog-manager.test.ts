import { describe, it, expect } from "@jest/globals";
import {
  extractVersionFromContent,
  incrementVersion,
} from "../../src/lib/changelog-manager.js";
import { insertChangelogRow } from "../../src/tools/generate.js";

const makeDoc = (rows: string[]) =>
  `# Doc\n## 改訂履歴\n| 版数 | 日付 | 変更内容 | 変更者 |\n|------|------|----------|--------|\n${rows.join("\n")}\n## 承認欄\n`;

describe("extractVersionFromContent", () => {
  it("extracts standard format | 1.0 |", () => {
    const doc = makeDoc(["| 1.0 | 2026-01-01 | 初版 | Author |"]);
    expect(extractVersionFromContent(doc)).toBe("1.0");
  });

  it("extracts v-prefix format | v1.0 |", () => {
    const doc = makeDoc(["| v1.0 | 2026-01-01 | 初版 | Author |"]);
    expect(extractVersionFromContent(doc)).toBe("1.0");
  });

  it("returns last version from multiple rows", () => {
    const doc = makeDoc([
      "| 1.0 | 2026-01-01 | 初版 | A |",
      "| 1.1 | 2026-01-15 | 更新 | B |",
      "| 2.0 | 2026-02-01 | 大改訂 | C |",
    ]);
    expect(extractVersionFromContent(doc)).toBe("2.0");
  });

  it("returns empty string for no 改訂履歴", () => {
    const doc = "# Doc\n## 承認欄\nSome content.";
    expect(extractVersionFromContent(doc)).toBe("");
  });

  it("returns empty string for malformed table", () => {
    const doc = "# Doc\n## 改訂履歴\nNo table here.\n## 承認欄\n";
    expect(extractVersionFromContent(doc)).toBe("");
  });

  it("extracts semver X.Y.Z format", () => {
    const doc = makeDoc(["| 1.0.0 | 2026-01-01 | 初版 | A |", "| 1.0.2 | 2026-02-01 | 修正 | B |"]);
    expect(extractVersionFromContent(doc)).toBe("1.0.2");
  });

  it("extracts Japanese 第N版 format", () => {
    const doc = makeDoc(["| 第1版 | 2026-01-01 | 初版 | A |", "| 第3版 | 2026-02-01 | 改訂 | B |"]);
    expect(extractVersionFromContent(doc)).toBe("第3版");
  });

  it("returns highest version when mixing X.Y and X.Y.Z", () => {
    const doc = makeDoc(["| 1.0 | 2026-01-01 | 初版 | A |", "| 1.0.5 | 2026-02-01 | 修正 | B |"]);
    expect(extractVersionFromContent(doc)).toBe("1.0.5");
  });
});

describe("incrementVersion", () => {
  it("increments 1.0 → 1.1", () => {
    expect(incrementVersion("1.0")).toBe("1.1");
  });

  it("increments 1.9 → 2.0", () => {
    expect(incrementVersion("1.9")).toBe("2.0");
  });

  it("increments 9.9 → 10.0", () => {
    expect(incrementVersion("9.9")).toBe("10.0");
  });

  it("returns 1.0 for empty string", () => {
    expect(incrementVersion("")).toBe("1.0");
  });

  it("increments 3.5 → 3.6", () => {
    expect(incrementVersion("3.5")).toBe("3.6");
  });

  it("returns 1.0 for malformed input", () => {
    expect(incrementVersion("abc")).toBe("1.0");
    expect(incrementVersion("1")).toBe("1.0");
  });

  it("increments semver X.Y.Z format", () => {
    expect(incrementVersion("1.0.0")).toBe("1.0.1");
    expect(incrementVersion("2.1.3")).toBe("2.1.4");
    expect(incrementVersion("1.2.3")).toBe("1.2.4");
  });

  it("increments Japanese 第N版 format", () => {
    expect(incrementVersion("第1版")).toBe("第2版");
    expect(incrementVersion("第10版")).toBe("第11版");
  });
});

describe("insertChangelogRow", () => {
  it("inserts row after last data row", () => {
    const doc = makeDoc(["| 1.0 | 2026-01-01 | 初版 | A |"]);
    const result = insertChangelogRow(doc, "| 1.1 | 2026-02-24 | 更新 | |");
    expect(result).toContain("| 1.0 | 2026-01-01 | 初版 | A |");
    expect(result).toContain("| 1.1 | 2026-02-24 | 更新 | |");
    // New row should come after old row
    const idx1 = result.indexOf("| 1.0 |");
    const idx2 = result.indexOf("| 1.1 |");
    expect(idx2).toBeGreaterThan(idx1);
  });

  it("returns content unchanged if no 改訂履歴 table", () => {
    const doc = "# Doc\n## 承認欄\n";
    const result = insertChangelogRow(doc, "| 1.0 | 2026-01-01 | New | |");
    expect(result).toBe(doc);
  });

  it("handles multiple existing rows", () => {
    const doc = makeDoc([
      "| 1.0 | 2026-01-01 | A | X |",
      "| 1.1 | 2026-01-15 | B | Y |",
    ]);
    const result = insertChangelogRow(doc, "| 1.2 | 2026-02-24 | C | Z |");
    const lines = result.split("\n");
    const dataRows = lines.filter(l => /^\|\s*\d+\.\d+\s*\|/.test(l));
    expect(dataRows).toHaveLength(3);
    expect(dataRows[2]).toContain("1.2");
  });
});
