import { describe, it, expect } from "@jest/globals";
import { computeCoverageMetrics } from "../../src/lib/coverage-metrics.js";

describe("computeCoverageMetrics — empty input", () => {
  it("returns zero metrics when matrix is empty", () => {
    const result = computeCoverageMetrics([], []);
    expect(result.overall).toBe(0);
    expect(result.reqToDesign).toBe(0);
    expect(result.reqToTest).toBe(0);
    expect(result.fullTrace).toBe(0);
    expect(result.byDocType).toEqual({});
  });
});

describe("computeCoverageMetrics — basic coverage", () => {
  it("computes overall as traced/total percentage", () => {
    const matrix = [
      { id: "REQ-001", doc_type: "requirements", downstream_refs: ["basic-design"] },
      { id: "REQ-002", doc_type: "requirements", downstream_refs: [] },
    ];
    const result = computeCoverageMetrics(matrix, []);
    expect(result.overall).toBe(50); // 1 of 2 traced
  });

  it("returns 100% overall when all entries are traced", () => {
    const matrix = [
      { id: "REQ-001", doc_type: "requirements", downstream_refs: ["basic-design"] },
      { id: "REQ-002", doc_type: "requirements", downstream_refs: ["detail-design"] },
    ];
    const result = computeCoverageMetrics(matrix, []);
    expect(result.overall).toBe(100);
  });

  it("returns 0% overall when no entries are traced", () => {
    const matrix = [
      { id: "REQ-001", doc_type: "requirements", downstream_refs: [] },
      { id: "REQ-002", doc_type: "requirements", downstream_refs: [] },
    ];
    const result = computeCoverageMetrics(matrix, []);
    expect(result.overall).toBe(0);
  });
});

describe("computeCoverageMetrics — byDocType grouping", () => {
  it("groups entries correctly by doc_type", () => {
    const matrix = [
      { id: "REQ-001", doc_type: "requirements", downstream_refs: ["basic-design"] },
      { id: "REQ-002", doc_type: "requirements", downstream_refs: [] },
      { id: "F-001", doc_type: "functions-list", downstream_refs: ["basic-design"] },
    ];
    const result = computeCoverageMetrics(matrix, []);
    expect(result.byDocType["requirements"].total).toBe(2);
    expect(result.byDocType["requirements"].traced).toBe(1);
    expect(result.byDocType["requirements"].coverage).toBe(50);
    expect(result.byDocType["functions-list"].total).toBe(1);
    expect(result.byDocType["functions-list"].traced).toBe(1);
    expect(result.byDocType["functions-list"].coverage).toBe(100);
  });
});

describe("computeCoverageMetrics — reqToDesign", () => {
  it("counts requirements entries with design downstream refs", () => {
    const matrix = [
      { id: "REQ-001", doc_type: "requirements", downstream_refs: ["basic-design"] },
      { id: "REQ-002", doc_type: "requirements", downstream_refs: ["detail-design"] },
      { id: "REQ-003", doc_type: "requirements", downstream_refs: [] },
    ];
    const result = computeCoverageMetrics(matrix, []);
    // 2 of 3 requirements have design refs
    expect(result.reqToDesign).toBe(67);
  });

  it("returns 0 reqToDesign when no requirements present", () => {
    const matrix = [
      { id: "F-001", doc_type: "functions-list", downstream_refs: ["basic-design"] },
    ];
    const result = computeCoverageMetrics(matrix, []);
    expect(result.reqToDesign).toBe(0);
  });
});

describe("computeCoverageMetrics — reqToTest", () => {
  it("counts requirements entries with test downstream refs", () => {
    const matrix = [
      { id: "REQ-001", doc_type: "requirements", downstream_refs: ["ut-spec"] },
      { id: "REQ-002", doc_type: "requirements", downstream_refs: ["it-spec"] },
      { id: "REQ-003", doc_type: "requirements", downstream_refs: ["basic-design"] },
    ];
    const result = computeCoverageMetrics(matrix, []);
    // REQ-001 and REQ-002 have test refs; REQ-003 does not
    expect(result.reqToTest).toBe(67);
  });
});

describe("computeCoverageMetrics — fullTrace", () => {
  it("counts requirements with BOTH design AND test refs", () => {
    const matrix = [
      { id: "REQ-001", doc_type: "requirements", downstream_refs: ["basic-design", "ut-spec"] },
      { id: "REQ-002", doc_type: "requirements", downstream_refs: ["basic-design"] },
      { id: "REQ-003", doc_type: "requirements", downstream_refs: [] },
    ];
    const result = computeCoverageMetrics(matrix, []);
    // Only REQ-001 has both design + test
    expect(result.fullTrace).toBe(33);
  });

  it("returns 100% fullTrace when all requirements have both design and test refs", () => {
    const matrix = [
      { id: "REQ-001", doc_type: "requirements", downstream_refs: ["basic-design", "ut-spec"] },
      { id: "REQ-002", doc_type: "requirements", downstream_refs: ["detail-design", "st-spec"] },
    ];
    const result = computeCoverageMetrics(matrix, []);
    expect(result.fullTrace).toBe(100);
  });
});

describe("computeCoverageMetrics — all design doc types recognized", () => {
  it("recognizes security-design as a design doc", () => {
    const matrix = [
      { id: "REQ-001", doc_type: "requirements", downstream_refs: ["security-design"] },
    ];
    const result = computeCoverageMetrics(matrix, []);
    expect(result.reqToDesign).toBe(100);
  });

  it("recognizes test-plan as a test doc", () => {
    const matrix = [
      { id: "REQ-001", doc_type: "requirements", downstream_refs: ["test-plan"] },
    ];
    const result = computeCoverageMetrics(matrix, []);
    expect(result.reqToTest).toBe(100);
  });
});
