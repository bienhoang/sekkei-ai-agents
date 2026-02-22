import { describe, it, expect } from "@jest/globals";
import {
  extractHeadings,
  extractFrontmatter,
  checkStructureRules,
} from "../../src/lib/structure-rules.js";
import type { StructureRuleContext } from "../../src/lib/structure-rules.js";

// ---------------------------------------------------------------------------
// extractHeadings
// ---------------------------------------------------------------------------

describe("extractHeadings", () => {
  it("extracts H2 and H3 headings with level and line number", () => {
    const content = "# H1\n## Section A\n### Sub A\n## Section B";
    const headings = extractHeadings(content);
    expect(headings).toHaveLength(3);
    expect(headings[0]).toMatchObject({ level: 2, text: "Section A", line: 2 });
    expect(headings[1]).toMatchObject({ level: 3, text: "Sub A", line: 3 });
    expect(headings[2]).toMatchObject({ level: 2, text: "Section B", line: 4 });
  });

  it("skips headings inside code blocks", () => {
    const content = "## Real\n```\n## Fake\n### Also fake\n```\n## Also real";
    const headings = extractHeadings(content);
    expect(headings).toHaveLength(2);
    expect(headings[0].text).toBe("Real");
    expect(headings[1].text).toBe("Also real");
  });

  it("returns empty array for content with no H2/H3", () => {
    const headings = extractHeadings("# Title\nSome text.\n#### H4");
    expect(headings).toHaveLength(0);
  });

  it("handles multiple code blocks correctly", () => {
    const content = "## A\n```\n## skip\n```\n## B\n```\n## skip2\n```\n## C";
    const headings = extractHeadings(content);
    expect(headings.map(h => h.text)).toEqual(["A", "B", "C"]);
  });
});

// ---------------------------------------------------------------------------
// extractFrontmatter
// ---------------------------------------------------------------------------

describe("extractFrontmatter", () => {
  it("parses valid YAML frontmatter", () => {
    const content = "---\ndoc_type: requirements\nversion: 1.0\n---\n## Section";
    const fm = extractFrontmatter(content);
    expect(fm).toMatchObject({ doc_type: "requirements", version: 1.0 });
  });

  it("returns null when no frontmatter present", () => {
    expect(extractFrontmatter("## No frontmatter")).toBeNull();
  });

  it("returns null for malformed YAML", () => {
    // Valid YAML that is not an object
    const content = "---\n- item1\n- item2\n---\ncontent";
    expect(extractFrontmatter(content)).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// required-sections rule
// ---------------------------------------------------------------------------

describe("required-sections rule", () => {
  it("reports error for missing section", () => {
    const ctx: StructureRuleContext = {
      content: "## 概要\n\nsome text\n",
      docType: "requirements",
      templateSections: ["概要", "機能要件", "非機能要件"],
    };
    const violations = checkStructureRules(ctx);
    const errs = violations.filter(v => v.rule === "required-sections");
    expect(errs.length).toBe(2);
    expect(errs.some(v => v.message.includes("機能要件"))).toBe(true);
    expect(errs.every(v => v.severity === "error")).toBe(true);
  });

  it("no violations when all sections present", () => {
    const ctx: StructureRuleContext = {
      content: "---\ndoc_type: requirements\nversion: 1.0\nstatus: draft\n---\n## 概要\n\ntext\n## 機能要件\n\ntext\n## 非機能要件\n\ntext",
      docType: "requirements",
      templateSections: ["概要", "機能要件", "非機能要件"],
      preset: "agile",
    };
    const violations = checkStructureRules(ctx);
    const errs = violations.filter(v => v.rule === "required-sections");
    expect(errs).toHaveLength(0);
  });

  it("normalizes numbered sections (e.g. '1. 概要' matches '概要')", () => {
    const ctx: StructureRuleContext = {
      content: "## 1. 概要\n\ntext",
      docType: "requirements",
      templateSections: ["概要"],
    };
    const violations = checkStructureRules(ctx);
    const errs = violations.filter(v => v.rule === "required-sections");
    expect(errs).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// section-ordering rule
// ---------------------------------------------------------------------------

describe("section-ordering rule", () => {
  const templateSections = ["概要", "機能要件", "非機能要件"];

  it("reports warning for out-of-order section (enterprise)", () => {
    const ctx: StructureRuleContext = {
      content: "## 機能要件\n\ntext\n## 概要\n\ntext\n## 非機能要件\n\ntext",
      docType: "requirements",
      templateSections,
      preset: "enterprise",
    };
    const violations = checkStructureRules(ctx);
    const warns = violations.filter(v => v.rule === "section-ordering");
    expect(warns.length).toBeGreaterThan(0);
    expect(warns[0].severity).toBe("warning");
  });

  it("reports warning for out-of-order section (standard)", () => {
    const ctx: StructureRuleContext = {
      content: "## 機能要件\n\ntext\n## 概要\n\ntext\n## 非機能要件\n\ntext",
      docType: "requirements",
      templateSections,
      preset: "standard",
    };
    const violations = checkStructureRules(ctx);
    expect(violations.filter(v => v.rule === "section-ordering").length).toBeGreaterThan(0);
  });

  it("does NOT trigger ordering check for agile preset", () => {
    const ctx: StructureRuleContext = {
      content: "## 機能要件\n\ntext\n## 概要\n\ntext\n## 非機能要件\n\ntext",
      docType: "requirements",
      templateSections,
      preset: "agile",
    };
    const violations = checkStructureRules(ctx);
    expect(violations.filter(v => v.rule === "section-ordering")).toHaveLength(0);
  });

  it("no violation when sections in correct order", () => {
    const ctx: StructureRuleContext = {
      content: "## 概要\n\ntext\n## 機能要件\n\ntext\n## 非機能要件\n\ntext",
      docType: "requirements",
      templateSections,
      preset: "enterprise",
    };
    const violations = checkStructureRules(ctx);
    expect(violations.filter(v => v.rule === "section-ordering")).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// unexpected-sections rule
// ---------------------------------------------------------------------------

describe("unexpected-sections rule", () => {
  const templateSections = ["概要", "機能要件"];

  it("reports warning for extra section (enterprise only)", () => {
    const ctx: StructureRuleContext = {
      content: "## 概要\n\ntext\n## 機能要件\n\ntext\n## 追加セクション\n\ntext",
      docType: "requirements",
      templateSections,
      preset: "enterprise",
    };
    const violations = checkStructureRules(ctx);
    const warns = violations.filter(v => v.rule === "unexpected-sections");
    expect(warns.length).toBe(1);
    expect(warns[0].message).toContain("追加セクション");
    expect(warns[0].severity).toBe("warning");
  });

  it("does NOT trigger for standard preset", () => {
    const ctx: StructureRuleContext = {
      content: "## 概要\n\ntext\n## 機能要件\n\ntext\n## 追加セクション\n\ntext",
      docType: "requirements",
      templateSections,
      preset: "standard",
    };
    const violations = checkStructureRules(ctx);
    expect(violations.filter(v => v.rule === "unexpected-sections")).toHaveLength(0);
  });

  it("does NOT trigger for agile preset", () => {
    const ctx: StructureRuleContext = {
      content: "## 概要\n\ntext\n## 機能要件\n\ntext\n## 追加\n\ntext",
      docType: "requirements",
      templateSections,
      preset: "agile",
    };
    const violations = checkStructureRules(ctx);
    expect(violations.filter(v => v.rule === "unexpected-sections")).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// frontmatter-fields rule
// ---------------------------------------------------------------------------

describe("frontmatter-fields rule", () => {
  it("reports error for missing doc_type", () => {
    const ctx: StructureRuleContext = {
      content: "---\nversion: 1.0\n---\n## 概要",
      docType: "requirements",
      templateSections: [],
    };
    const violations = checkStructureRules(ctx);
    const errs = violations.filter(v => v.rule === "frontmatter-fields");
    expect(errs.some(v => v.message.includes("doc_type"))).toBe(true);
    expect(errs.every(v => v.severity === "error")).toBe(true);
  });

  it("reports error for missing version", () => {
    const ctx: StructureRuleContext = {
      content: "---\ndoc_type: requirements\n---\n## 概要",
      docType: "requirements",
      templateSections: [],
    };
    const violations = checkStructureRules(ctx);
    const errs = violations.filter(v => v.rule === "frontmatter-fields");
    expect(errs.some(v => v.message.includes("version"))).toBe(true);
  });

  it("no violation when both doc_type and version present", () => {
    const ctx: StructureRuleContext = {
      content: "---\ndoc_type: requirements\nversion: 1.0\nstatus: draft\n---\n## 概要",
      docType: "requirements",
      templateSections: [],
      preset: "agile",
    };
    const violations = checkStructureRules(ctx);
    expect(violations.filter(v => v.rule === "frontmatter-fields")).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// frontmatter-status rule
// ---------------------------------------------------------------------------

describe("frontmatter-status rule", () => {
  it("reports warning for missing status field (enterprise)", () => {
    const ctx: StructureRuleContext = {
      content: "---\ndoc_type: requirements\nversion: 1.0\n---\n## 概要",
      docType: "requirements",
      templateSections: [],
      preset: "enterprise",
    };
    const violations = checkStructureRules(ctx);
    const warns = violations.filter(v => v.rule === "frontmatter-status");
    expect(warns.length).toBe(1);
    expect(warns[0].severity).toBe("warning");
  });

  it("reports warning for missing status field (standard)", () => {
    const ctx: StructureRuleContext = {
      content: "---\ndoc_type: requirements\nversion: 1.0\n---\n## 概要",
      docType: "requirements",
      templateSections: [],
      preset: "standard",
    };
    const violations = checkStructureRules(ctx);
    expect(violations.filter(v => v.rule === "frontmatter-status").length).toBe(1);
  });

  it("does NOT warn for agile preset missing status", () => {
    const ctx: StructureRuleContext = {
      content: "---\ndoc_type: requirements\nversion: 1.0\n---\n## 概要",
      docType: "requirements",
      templateSections: [],
      preset: "agile",
    };
    const violations = checkStructureRules(ctx);
    expect(violations.filter(v => v.rule === "frontmatter-status")).toHaveLength(0);
  });

  it("no violation when valid status present", () => {
    const ctx: StructureRuleContext = {
      content: "---\ndoc_type: requirements\nversion: 1.0\nstatus: approved\n---\n## 概要",
      docType: "requirements",
      templateSections: [],
      preset: "enterprise",
    };
    const violations = checkStructureRules(ctx);
    expect(violations.filter(v => v.rule === "frontmatter-status")).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// heading-level-hierarchy rule
// ---------------------------------------------------------------------------

describe("heading-level-hierarchy rule", () => {
  it("reports error when H3 appears before any H2", () => {
    const ctx: StructureRuleContext = {
      content: "### Orphan sub\n## Parent section\n### Child",
      docType: "requirements",
      templateSections: [],
      preset: "agile",
    };
    const violations = checkStructureRules(ctx);
    const errs = violations.filter(v => v.rule === "heading-level-hierarchy");
    expect(errs.length).toBe(1);
    expect(errs[0].severity).toBe("error");
    expect(errs[0].message).toContain("Orphan sub");
  });

  it("no violation when H3 follows H2", () => {
    const ctx: StructureRuleContext = {
      content: "---\ndoc_type: requirements\nversion: 1.0\nstatus: draft\n---\n## Parent\n### Child\n## Another",
      docType: "requirements",
      templateSections: ["Parent", "Another"],
      preset: "agile",
    };
    const violations = checkStructureRules(ctx);
    expect(violations.filter(v => v.rule === "heading-level-hierarchy")).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// empty-sections rule
// ---------------------------------------------------------------------------

describe("empty-sections rule", () => {
  it("reports warning for heading with no content (enterprise)", () => {
    const ctx: StructureRuleContext = {
      content: "## Section A\n\n## Section B\n\nsome content",
      docType: "requirements",
      templateSections: [],
      preset: "enterprise",
    };
    const violations = checkStructureRules(ctx);
    const warns = violations.filter(v => v.rule === "empty-sections");
    expect(warns.some(v => v.message.includes("Section A"))).toBe(true);
    expect(warns.every(v => v.severity === "warning")).toBe(true);
  });

  it("does NOT trigger empty-sections for agile preset", () => {
    const ctx: StructureRuleContext = {
      content: "## Section A\n\n## Section B\n\nsome content",
      docType: "requirements",
      templateSections: [],
      preset: "agile",
    };
    const violations = checkStructureRules(ctx);
    expect(violations.filter(v => v.rule === "empty-sections")).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// preset filtering
// ---------------------------------------------------------------------------

describe("preset filtering", () => {
  it("agile preset skips ordering, unexpected-sections, empty-sections, frontmatter-status", () => {
    const ctx: StructureRuleContext = {
      content: "---\ndoc_type: requirements\nversion: 1.0\n---\n## 機能要件\n\ntext\n## 概要\n\ntext\n## 非機能要件\n\ntext\n## 追加\n\ntext",
      docType: "requirements",
      templateSections: ["概要", "機能要件", "非機能要件"],
      preset: "agile",
    };
    const violations = checkStructureRules(ctx);
    const skippedRules = ["section-ordering", "unexpected-sections", "empty-sections", "frontmatter-status"];
    for (const rule of skippedRules) {
      expect(violations.filter(v => v.rule === rule)).toHaveLength(0);
    }
  });
});

// ---------------------------------------------------------------------------
// empty template sections
// ---------------------------------------------------------------------------

describe("empty templateSections", () => {
  it("produces no required-sections or ordering violations", () => {
    const ctx: StructureRuleContext = {
      content: "---\ndoc_type: requirements\nversion: 1.0\nstatus: draft\n---\n## 概要\n\ntext",
      docType: "requirements",
      templateSections: [],
      preset: "enterprise",
    };
    const violations = checkStructureRules(ctx);
    expect(violations.filter(v => v.rule === "required-sections")).toHaveLength(0);
    expect(violations.filter(v => v.rule === "section-ordering")).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// checkStructureRules integration
// ---------------------------------------------------------------------------

describe("checkStructureRules integration", () => {
  it("returns multiple violations for a poorly structured document", () => {
    const ctx: StructureRuleContext = {
      // No frontmatter, H3 before H2, missing required sections
      content: "### Orphan\n## 機能要件\n\ntext",
      docType: "requirements",
      templateSections: ["概要", "機能要件", "非機能要件"],
      preset: "standard",
    };
    const violations = checkStructureRules(ctx);
    const ruleNames = violations.map(v => v.rule);
    expect(ruleNames).toContain("required-sections");
    expect(ruleNames).toContain("heading-level-hierarchy");
    expect(ruleNames).toContain("frontmatter-fields");
  });

  it("returns no violations for a well-formed document (standard preset)", () => {
    const content = [
      "---",
      "doc_type: requirements",
      "version: 1.0",
      "status: draft",
      "---",
      "## 概要",
      "",
      "プロジェクト概要です。",
      "",
      "## 機能要件",
      "",
      "機能要件の説明。",
      "",
      "## 非機能要件",
      "",
      "非機能要件の説明。",
    ].join("\n");
    const ctx: StructureRuleContext = {
      content,
      docType: "requirements",
      templateSections: ["概要", "機能要件", "非機能要件"],
      preset: "standard",
    };
    const violations = checkStructureRules(ctx);
    expect(violations).toHaveLength(0);
  });
});
