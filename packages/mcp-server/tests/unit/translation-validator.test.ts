import { describe, it, expect } from "@jest/globals";
import { validateTranslation } from "../../src/lib/translation-validator.js";

describe("validateTranslation", () => {
  it("returns 0 warnings for identical documents", () => {
    const doc = "# Title\n\nREQ-001: Some requirement\n\n| Col1 | Col2 |\n|------|------|\n| a | b |\n";
    const result = validateTranslation(doc, doc);
    expect(result.warnings).toHaveLength(0);
    expect(result.stats.missingIds).toHaveLength(0);
  });

  it("detects missing IDs in translated document", () => {
    const source = "REQ-001: First\nREQ-002: Second\nF-001: Feature";
    const translated = "REQ-001: First translated\nF-001: Feature translated";
    const result = validateTranslation(source, translated);
    expect(result.warnings.length).toBeGreaterThan(0);
    expect(result.stats.missingIds).toContain("REQ-002");
    expect(result.stats.missingIds).not.toContain("REQ-001");
  });

  it("warns on table row count mismatch", () => {
    const source = [
      "| H1 | H2 |", "|---|---|",
      "| a | b |", "| c | d |", "| e | f |",
    ].join("\n");
    const translated = [
      "| H1 | H2 |", "|---|---|",
      "| a | b |",
    ].join("\n");
    const result = validateTranslation(source, translated);
    expect(result.warnings.some((w) => w.includes("Table row count"))).toBe(true);
    expect(result.stats.sourceTableRows).toBe(4); // header + 3 data rows
    expect(result.stats.translatedTableRows).toBe(2); // header + 1 data row
  });

  it("warns on heading count mismatch", () => {
    const source = "# H1\n## H2\n### H3\n";
    const translated = "# H1\n## H2\n";
    const result = validateTranslation(source, translated);
    expect(result.warnings.some((w) => w.includes("Heading count"))).toBe(true);
    expect(result.stats.sourceHeadings).toBe(3);
    expect(result.stats.translatedHeadings).toBe(2);
  });

  it("handles empty documents without crashing", () => {
    const result = validateTranslation("", "");
    expect(result.warnings).toHaveLength(0);
    expect(result.stats.sourceIdCount).toBe(0);
  });

  it("handles large documents within reasonable time", () => {
    const line = "REQ-001: Some requirement with | table | row |\n";
    const large = line.repeat(5000); // ~240K chars
    const start = performance.now();
    const result = validateTranslation(large, large);
    const elapsed = performance.now() - start;
    expect(elapsed).toBeLessThan(500); // generous limit
    expect(result.warnings).toHaveLength(0);
  });
});
