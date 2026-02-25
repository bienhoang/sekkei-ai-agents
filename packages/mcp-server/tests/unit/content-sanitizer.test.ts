/**
 * Tests for content-sanitizer.ts — sanitizeForReadOnly function.
 *
 * Used by export_document when read_only=true to strip internal metadata
 * (confidence, source, learn annotations) before external sharing.
 */
import { describe, it, expect } from "@jest/globals";
import { sanitizeForReadOnly } from "../../src/lib/content-sanitizer.js";

describe("sanitizeForReadOnly", () => {
  it("strips confidence HTML comments", () => {
    const input = "# Title\n<!-- confidence: 高 -->\nParagraph text.";
    const result = sanitizeForReadOnly(input);
    expect(result).not.toContain("confidence");
    expect(result).toContain("Paragraph text.");
  });

  it("strips source HTML comments", () => {
    const input = "Some text <!-- source: RFP section 3.2 --> here.";
    const result = sanitizeForReadOnly(input);
    expect(result).not.toContain("source:");
    expect(result).toContain("Some text");
    expect(result).toContain("here.");
  });

  it("strips learn HTML comments", () => {
    const input = "Content <!-- learn: pattern observed --> more.";
    const result = sanitizeForReadOnly(input);
    expect(result).not.toContain("learn:");
    expect(result).toContain("Content");
  });

  it("strips internal block comments", () => {
    const input = [
      "Public content",
      "<!-- internal -->",
      "Secret internal note",
      "More internal stuff",
      "<!-- /internal -->",
      "More public content",
    ].join("\n");
    const result = sanitizeForReadOnly(input);
    expect(result).not.toContain("Secret internal note");
    expect(result).not.toContain("More internal stuff");
    expect(result).toContain("Public content");
    expect(result).toContain("More public content");
  });

  it("replaces draft watermark with public version label", () => {
    const input = "AI下書き — 未承認\n\n# Document";
    const result = sanitizeForReadOnly(input);
    expect(result).not.toContain("AI下書き");
    expect(result).toContain("公開版");
  });

  it("collapses triple+ newlines to double", () => {
    const input = "Line 1\n\n\n\n\nLine 2";
    const result = sanitizeForReadOnly(input);
    expect(result).toBe("Line 1\n\nLine 2");
  });

  it("returns content unchanged when no internal metadata present", () => {
    const input = "# Clean Document\n\nNo metadata here.";
    const result = sanitizeForReadOnly(input);
    expect(result).toBe(input);
  });

  it("handles empty string", () => {
    expect(sanitizeForReadOnly("")).toBe("");
  });

  it("strips multiple annotations in the same document", () => {
    const input = [
      "# Title",
      "<!-- confidence: 高 -->",
      "## Section",
      "<!-- source: input.md -->",
      "Content <!-- learn: pattern --> here.",
    ].join("\n");
    const result = sanitizeForReadOnly(input);
    expect(result).not.toContain("confidence");
    expect(result).not.toContain("source:");
    expect(result).not.toContain("learn:");
    expect(result).toContain("# Title");
    expect(result).toContain("## Section");
  });
});
