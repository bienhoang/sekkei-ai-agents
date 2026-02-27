import { describe, it, expect } from "@jest/globals";
import { computeHealthScore } from "../../src/lib/health-scorer.js";

describe("computeHealthScore — empty input", () => {
  it("returns zero overall with empty perDoc when no results provided", () => {
    const result = computeHealthScore([]);
    expect(result.overall).toBe(0);
    expect(result.perDoc).toHaveLength(0);
  });
});

describe("computeHealthScore — perfect doc", () => {
  it("scores 100 for a document with no issues", () => {
    const result = computeHealthScore([
      { docType: "requirements", result: { issues: [] } },
    ]);
    expect(result.overall).toBe(100);
    expect(result.perDoc[0].score).toBe(100);
    expect(result.perDoc[0].topIssues).toHaveLength(0);
  });
});

describe("computeHealthScore — error deductions", () => {
  it("deducts 10 per error (severity=error)", () => {
    const result = computeHealthScore([
      {
        docType: "basic-design",
        result: {
          issues: [
            { severity: "error" as const, message: "Missing section: 概要" },
            { severity: "error" as const, message: "Missing section: DB設計" },
          ],
        },
      },
    ]);
    expect(result.perDoc[0].score).toBe(80); // 100 - 10*2
  });

  it("deducts 3 per warning (severity=warning)", () => {
    const result = computeHealthScore([
      {
        docType: "nfr",
        result: {
          issues: [
            { severity: "warning" as const, message: "Keigo violation" },
            { severity: "warning" as const, message: "Content depth insufficient" },
          ],
        },
      },
    ]);
    expect(result.perDoc[0].score).toBe(94); // 100 - 3*2
  });

  it("treats unspecified severity as error", () => {
    const result = computeHealthScore([
      {
        docType: "test-plan",
        result: {
          issues: [
            { message: "Missing required section" },
          ],
        },
      },
    ]);
    expect(result.perDoc[0].score).toBe(90); // 100 - 10*1
  });

  it("does not go below 0 for heavily flawed documents", () => {
    const issues = Array.from({ length: 20 }, (_, i) => ({
      severity: "error" as const,
      message: `Error ${i + 1}`,
    }));
    const result = computeHealthScore([
      { docType: "detail-design", result: { issues } },
    ]);
    expect(result.perDoc[0].score).toBe(0);
  });
});

describe("computeHealthScore — mixed errors and warnings", () => {
  it("combines error and warning deductions correctly", () => {
    const result = computeHealthScore([
      {
        docType: "security-design",
        result: {
          issues: [
            { severity: "error" as const, message: "Missing section A" },
            { severity: "warning" as const, message: "Style warning" },
          ],
        },
      },
    ]);
    // 100 - 10 - 3 = 87
    expect(result.perDoc[0].score).toBe(87);
  });
});

describe("computeHealthScore — topIssues", () => {
  it("returns up to 3 error messages as topIssues", () => {
    const result = computeHealthScore([
      {
        docType: "requirements",
        result: {
          issues: [
            { severity: "error" as const, message: "Error A" },
            { severity: "error" as const, message: "Error B" },
            { severity: "error" as const, message: "Error C" },
            { severity: "error" as const, message: "Error D" },
          ],
        },
      },
    ]);
    expect(result.perDoc[0].topIssues).toHaveLength(3);
    expect(result.perDoc[0].topIssues[0]).toBe("Error A");
    expect(result.perDoc[0].topIssues[2]).toBe("Error C");
  });

  it("excludes warning messages from topIssues", () => {
    const result = computeHealthScore([
      {
        docType: "nfr",
        result: {
          issues: [
            { severity: "warning" as const, message: "Warning only" },
          ],
        },
      },
    ]);
    expect(result.perDoc[0].topIssues).toHaveLength(0);
  });
});

describe("computeHealthScore — overall average", () => {
  it("computes overall as arithmetic average of per-doc scores", () => {
    const result = computeHealthScore([
      { docType: "requirements", result: { issues: [] } },                    // 100
      { docType: "basic-design", result: {
        issues: [{ severity: "error" as const, message: "E1" }],
      }},                                                                       // 90
    ]);
    expect(result.overall).toBe(95); // (100 + 90) / 2
  });

  it("rounds overall to nearest integer", () => {
    const result = computeHealthScore([
      { docType: "doc-a", result: { issues: [] } },   // 100
      { docType: "doc-b", result: {
        issues: [{ severity: "warning" as const, message: "W" }],
      }},                                               // 97
      { docType: "doc-c", result: {
        issues: [{ severity: "warning" as const, message: "W" }],
      }},                                               // 97
    ]);
    // (100 + 97 + 97) / 3 = 98
    expect(result.overall).toBe(98);
  });

  it("preserves docType in perDoc entries", () => {
    const result = computeHealthScore([
      { docType: "ut-spec", result: { issues: [] } },
      { docType: "st-spec", result: { issues: [] } },
    ]);
    expect(result.perDoc[0].docType).toBe("ut-spec");
    expect(result.perDoc[1].docType).toBe("st-spec");
  });
});
