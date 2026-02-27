import { describe, it, expect } from "@jest/globals";
import { computeRiskScore } from "../../src/lib/risk-scorer.js";

describe("computeRiskScore — formula correctness", () => {
  it("computes overall using weighted formula", () => {
    const result = computeRiskScore({
      traceCompleteness: 100,
      nfrCoverage: 100,
      testCoverage: 100,
      freshness: 100,
      structuralHealth: 100,
    });
    // 0.30*100 + 0.20*100 + 0.20*100 + 0.15*100 + 0.15*100 = 100
    expect(result.overall).toBe(100);
  });

  it("computes overall correctly with all zeros", () => {
    const result = computeRiskScore({
      traceCompleteness: 0,
      nfrCoverage: 0,
      testCoverage: 0,
      freshness: 0,
      structuralHealth: 0,
    });
    expect(result.overall).toBe(0);
  });

  it("applies weights correctly for mixed values", () => {
    // 0.30*80 + 0.20*70 + 0.20*60 + 0.15*50 + 0.15*40
    // = 24 + 14 + 12 + 7.5 + 6 = 63.5 → rounds to 64
    const result = computeRiskScore({
      traceCompleteness: 80,
      nfrCoverage: 70,
      testCoverage: 60,
      freshness: 50,
      structuralHealth: 40,
    });
    expect(result.overall).toBe(64);
  });

  it("trace completeness has highest weight (0.30)", () => {
    const highTrace = computeRiskScore({
      traceCompleteness: 100,
      nfrCoverage: 0,
      testCoverage: 0,
      freshness: 0,
      structuralHealth: 0,
    });
    const highNfr = computeRiskScore({
      traceCompleteness: 0,
      nfrCoverage: 100,
      testCoverage: 0,
      freshness: 0,
      structuralHealth: 0,
    });
    expect(highTrace.overall).toBeGreaterThan(highNfr.overall);
    expect(highTrace.overall).toBe(30);
    expect(highNfr.overall).toBe(20);
  });
});

describe("computeRiskScore — grade boundaries", () => {
  it("assigns green grade when overall >= 80", () => {
    const result = computeRiskScore({
      traceCompleteness: 100,
      nfrCoverage: 100,
      testCoverage: 100,
      freshness: 100,
      structuralHealth: 100,
    });
    expect(result.grade).toBe("green");
  });

  it("assigns green grade at exact boundary of 80", () => {
    // Need overall == 80
    // 0.30*80 + 0.20*80 + 0.20*80 + 0.15*80 + 0.15*80 = 80
    const result = computeRiskScore({
      traceCompleteness: 80,
      nfrCoverage: 80,
      testCoverage: 80,
      freshness: 80,
      structuralHealth: 80,
    });
    expect(result.overall).toBe(80);
    expect(result.grade).toBe("green");
  });

  it("assigns yellow grade when overall >= 60 and < 80", () => {
    // 0.30*60 + 0.20*60 + 0.20*60 + 0.15*60 + 0.15*60 = 60
    const result = computeRiskScore({
      traceCompleteness: 60,
      nfrCoverage: 60,
      testCoverage: 60,
      freshness: 60,
      structuralHealth: 60,
    });
    expect(result.overall).toBe(60);
    expect(result.grade).toBe("yellow");
  });

  it("assigns yellow grade at exact boundary of 60", () => {
    const result = computeRiskScore({
      traceCompleteness: 60,
      nfrCoverage: 60,
      testCoverage: 60,
      freshness: 60,
      structuralHealth: 60,
    });
    expect(result.grade).toBe("yellow");
  });

  it("assigns red grade when overall < 60", () => {
    const result = computeRiskScore({
      traceCompleteness: 50,
      nfrCoverage: 50,
      testCoverage: 50,
      freshness: 50,
      structuralHealth: 50,
    });
    expect(result.overall).toBe(50);
    expect(result.grade).toBe("red");
  });

  it("assigns red grade at 0", () => {
    const result = computeRiskScore({
      traceCompleteness: 0,
      nfrCoverage: 0,
      testCoverage: 0,
      freshness: 0,
      structuralHealth: 0,
    });
    expect(result.grade).toBe("red");
  });

  it("assigns red grade at 59", () => {
    // All at 59: 0.30*59 + 0.20*59 + 0.20*59 + 0.15*59 + 0.15*59 = 59
    const result = computeRiskScore({
      traceCompleteness: 59,
      nfrCoverage: 59,
      testCoverage: 59,
      freshness: 59,
      structuralHealth: 59,
    });
    expect(result.overall).toBe(59);
    expect(result.grade).toBe("red");
  });

  it("assigns yellow grade at 79 (just below green)", () => {
    // All at 79: overall = 79
    const result = computeRiskScore({
      traceCompleteness: 79,
      nfrCoverage: 79,
      testCoverage: 79,
      freshness: 79,
      structuralHealth: 79,
    });
    expect(result.overall).toBe(79);
    expect(result.grade).toBe("yellow");
  });
});

describe("computeRiskScore — breakdown passthrough", () => {
  it("preserves all input values in the breakdown", () => {
    const params = {
      traceCompleteness: 85,
      nfrCoverage: 70,
      testCoverage: 65,
      freshness: 90,
      structuralHealth: 75,
    };
    const result = computeRiskScore(params);
    expect(result.breakdown.traceCompleteness).toBe(85);
    expect(result.breakdown.nfrCoverage).toBe(70);
    expect(result.breakdown.testCoverage).toBe(65);
    expect(result.breakdown.freshness).toBe(90);
    expect(result.breakdown.structuralHealth).toBe(75);
  });
});
