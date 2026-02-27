/**
 * Risk scorer: computes an overall project risk score from five dimensions.
 * Formula: 0.30*trace + 0.20*nfr + 0.20*test + 0.15*fresh + 0.15*health
 * Grade: >=80 green, >=60 yellow, <60 red
 */
import type { RiskScore } from "../types/documents.js";

interface RiskParams {
  traceCompleteness: number;
  nfrCoverage: number;
  testCoverage: number;
  freshness: number;
  structuralHealth: number;
}

/**
 * Compute overall risk score and grade from five weighted dimensions.
 * All inputs should be in the range [0, 100].
 */
export function computeRiskScore(params: RiskParams): RiskScore {
  const { traceCompleteness, nfrCoverage, testCoverage, freshness, structuralHealth } = params;

  const overall = Math.round(
    0.30 * traceCompleteness +
    0.20 * nfrCoverage +
    0.20 * testCoverage +
    0.15 * freshness +
    0.15 * structuralHealth
  );

  const grade: RiskScore["grade"] =
    overall >= 80 ? "green" :
    overall >= 60 ? "yellow" :
    "red";

  return {
    overall,
    grade,
    breakdown: {
      traceCompleteness,
      nfrCoverage,
      testCoverage,
      freshness,
      structuralHealth,
    },
  };
}
