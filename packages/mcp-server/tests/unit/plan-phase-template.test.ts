import { describe, it, expect } from "@jest/globals";
import { renderPhaseFile } from "../../src/lib/plan-phase-template.js";
import type { PlanPhase, PlanFeature } from "../../src/types/plan.js";

// --- Fixtures ---

const SPLIT_CONFIG = {
  shared: ["system-architecture", "database-design"],
  feature: ["module-design", "class-design"],
};

const SHARED_PHASE: PlanPhase = {
  number: 1,
  name: "Shared Sections",
  type: "shared",
  status: "pending",
  file: "phase-01-shared-sections.md",
};

const FEATURE_PHASE: PlanPhase = {
  number: 2,
  name: "Sales",
  type: "per-feature",
  feature_id: "sal",
  status: "pending",
  file: "phase-02-sal.md",
};

const VALIDATION_PHASE: PlanPhase = {
  number: 3,
  name: "Validation",
  type: "validation",
  status: "pending",
  file: "phase-final-validation.md",
};

const FEATURE: PlanFeature = {
  id: "sal",
  name: "Sales Management",
  complexity: "medium",
  priority: 1,
};

// --- Tests ---

describe("plan-phase-template", () => {
  describe("renderPhaseFile", () => {
    it("renders shared phase with YAML frontmatter", () => {
      const result = renderPhaseFile(SHARED_PHASE, "basic-design", SPLIT_CONFIG);
      expect(result).toContain("---");
      expect(result).toContain("phase: 1");
      expect(result).toContain("name: Shared Sections");
      expect(result).toContain("type: shared");
      expect(result).toContain("status: pending");
    });

    it("renders shared phase without feature_id", () => {
      const result = renderPhaseFile(SHARED_PHASE, "basic-design", SPLIT_CONFIG);
      expect(result).not.toContain("feature_id");
    });

    it("renders shared phase with correct scope sections", () => {
      const result = renderPhaseFile(SHARED_PHASE, "basic-design", SPLIT_CONFIG);
      expect(result).toContain("system-architecture, database-design");
    });

    it("renders shared phase with correct generation command", () => {
      const result = renderPhaseFile(SHARED_PHASE, "basic-design", SPLIT_CONFIG);
      expect(result).toContain("/sekkei:basic-design");
      expect(result).toContain('scope: "shared"');
    });

    it("renders per-feature phase with feature_id in frontmatter", () => {
      const result = renderPhaseFile(FEATURE_PHASE, "basic-design", SPLIT_CONFIG, FEATURE);
      expect(result).toContain("feature_id: sal");
    });

    it("renders per-feature phase with feature details in scope", () => {
      const result = renderPhaseFile(FEATURE_PHASE, "basic-design", SPLIT_CONFIG, FEATURE);
      expect(result).toContain("Feature: sal");
      expect(result).toContain("Sales Management");
      expect(result).toContain("complexity=medium");
    });

    it("renders per-feature phase with correct scope param", () => {
      const result = renderPhaseFile(FEATURE_PHASE, "basic-design", SPLIT_CONFIG, FEATURE);
      expect(result).toContain('scope: "feature"');
      expect(result).toContain('feature_id: "sal"');
    });

    it("renders validation phase with correct command", () => {
      const result = renderPhaseFile(VALIDATION_PHASE, "basic-design", SPLIT_CONFIG);
      expect(result).toContain("/sekkei:validate");
      expect(result).toContain("manifest path");
    });

    it("renders validation phase scope as 'all generated files'", () => {
      const result = renderPhaseFile(VALIDATION_PHASE, "basic-design", SPLIT_CONFIG);
      expect(result).toContain("all generated files");
    });

    it("includes TODO checklist in all phase types", () => {
      for (const phase of [SHARED_PHASE, FEATURE_PHASE, VALIDATION_PHASE]) {
        const result = renderPhaseFile(phase, "basic-design", SPLIT_CONFIG, FEATURE);
        expect(result).toContain("## TODO");
        expect(result).toContain("- [ ] Generate document");
        expect(result).toContain("- [ ] Review output");
        expect(result).toContain("- [ ] Validate cross-references");
      }
    });

    it("includes success criteria in all phase types", () => {
      const result = renderPhaseFile(SHARED_PHASE, "basic-design", SPLIT_CONFIG);
      expect(result).toContain("## Success Criteria");
      expect(result).toContain("Cross-reference IDs valid");
    });

    it("uses correct command for detail-design doc type", () => {
      const result = renderPhaseFile(SHARED_PHASE, "detail-design", SPLIT_CONFIG);
      expect(result).toContain("/sekkei:detail-design");
    });

    it("uses correct command for test-spec doc type", () => {
      const testPhase: PlanPhase = { ...FEATURE_PHASE, type: "per-feature" };
      const result = renderPhaseFile(testPhase, "test-spec", SPLIT_CONFIG, FEATURE);
      expect(result).toContain("/sekkei:test-spec");
    });

    it("falls back to sekkei:{docType} for unknown doc types", () => {
      const result = renderPhaseFile(SHARED_PHASE, "unknown-type", SPLIT_CONFIG);
      expect(result).toContain("/sekkei:unknown-type");
    });

    it("renders per-feature phase without feature arg gracefully", () => {
      // No feature passed — should not crash, just omit feature lines
      const result = renderPhaseFile(FEATURE_PHASE, "basic-design", SPLIT_CONFIG);
      expect(result).toContain("phase: 2");
      expect(result).toContain("feature_id: sal");
      // No "Feature: sal" scope line since no feature object
      expect(result).not.toContain("Survey data");
    });

    it("renders phase heading with correct number and name", () => {
      const result = renderPhaseFile(SHARED_PHASE, "basic-design", SPLIT_CONFIG);
      expect(result).toContain("# Phase 1: Shared Sections");
    });

    it("renders generation command section", () => {
      const result = renderPhaseFile(SHARED_PHASE, "basic-design", SPLIT_CONFIG);
      expect(result).toContain("## Generation Command");
    });

    it("handles empty split config gracefully", () => {
      const emptySplit = { shared: [], feature: [] };
      const result = renderPhaseFile(SHARED_PHASE, "basic-design", emptySplit);
      expect(result).toContain("Sections: ");
      expect(result).not.toContain("undefined");
    });
  });
});
