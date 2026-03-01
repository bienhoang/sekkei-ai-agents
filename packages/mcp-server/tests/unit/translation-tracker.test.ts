import { describe, it, expect } from "@jest/globals";
import {
  splitSections,
  hashSection,
  insertHashes,
  extractHashes,
  findChangedSections,
} from "../../src/lib/translation-tracker.js";

describe("translation-tracker", () => {
  describe("splitSections", () => {
    it("splits a 3-section document correctly", () => {
      const doc = "## Section A\nContent A\n\n## Section B\nContent B\n\n## Section C\nContent C";
      const sections = splitSections(doc);
      expect(sections).toHaveLength(3);
      expect(sections[0].heading).toBe("## Section A");
      expect(sections[1].heading).toBe("## Section B");
      expect(sections[2].heading).toBe("## Section C");
    });

    it("handles document with no headings as single section", () => {
      const doc = "Just some plain text\nwith multiple lines";
      const sections = splitSections(doc);
      expect(sections).toHaveLength(1);
      expect(sections[0].heading).toBe("_intro");
    });

    it("handles empty content", () => {
      const sections = splitSections("");
      expect(sections).toHaveLength(0);
    });

    it("captures intro content before first heading", () => {
      const doc = "---\ntitle: Test\n---\n\n## First Section\nContent";
      const sections = splitSections(doc);
      expect(sections).toHaveLength(2);
      expect(sections[0].heading).toBe("_intro");
      expect(sections[1].heading).toBe("## First Section");
    });
  });

  describe("hashSection", () => {
    it("produces deterministic 12-char hex output", () => {
      const hash1 = hashSection("## Test\nContent");
      const hash2 = hashSection("## Test\nContent");
      expect(hash1).toBe(hash2);
      expect(hash1).toMatch(/^[a-f0-9]{12}$/);
    });

    it("produces different hashes for different content", () => {
      const hash1 = hashSection("## A\nContent A");
      const hash2 = hashSection("## B\nContent B");
      expect(hash1).not.toBe(hash2);
    });
  });

  describe("insertHashes + extractHashes roundtrip", () => {
    it("roundtrips correctly (position-based)", () => {
      const source = "## Section A\nContent A\n\n## Section B\nContent B";
      const sections = splitSections(source);
      const withHashes = insertHashes(source, sections);

      // Markers should be present
      expect(withHashes).toContain("<!-- sekkei:translated:");

      // Extract and verify — returns ordered array
      const extracted = extractHashes(withHashes);
      expect(extracted).toHaveLength(2);
      expect(extracted[0]).toBe(sections[0].hash);
      expect(extracted[1]).toBe(sections[1].hash);
    });

    it("works with translated headings (position-based matching)", () => {
      // Simulate: source has Japanese headings, translated has English
      const source = "## 機能一覧\nContent A\n\n## 基本設計\nContent B";
      const sections = splitSections(source);
      const translated = "## Function List\nContent A\n\n## Basic Design\nContent B";
      const withHashes = insertHashes(translated, sections);

      expect(withHashes).toContain("<!-- sekkei:translated:");
      const extracted = extractHashes(withHashes);
      expect(extracted).toHaveLength(2);
      expect(extracted[0]).toBe(sections[0].hash);
    });
  });

  describe("findChangedSections", () => {
    it("detects one changed section", () => {
      const originalSections = splitSections("## A\nOriginal A\n\n## B\nOriginal B");
      const modifiedSource = "## A\nOriginal A\n\n## B\nModified B";
      const modifiedSections = splitSections(modifiedSource);

      // Simulate: existing hashes from original translation (position-based array)
      const existingHashes = originalSections.map((s) => s.hash);

      const changed = findChangedSections(modifiedSections, existingHashes);
      expect(changed).toHaveLength(1);
      expect(changed[0].heading).toBe("## B");
    });

    it("returns empty when no changes", () => {
      const sections = splitSections("## A\nContent A\n\n## B\nContent B");
      const hashes = sections.map((s) => s.hash);
      const changed = findChangedSections(sections, hashes);
      expect(changed).toHaveLength(0);
    });

    it("treats new sections as changed", () => {
      const sections = splitSections("## A\nContent\n\n## B\nContent\n\n## C\nNew");
      const existingHashes = [sections[0].hash]; // only first section known
      const changed = findChangedSections(sections, existingHashes);
      expect(changed).toHaveLength(2); // B and C are new
    });
  });
});
