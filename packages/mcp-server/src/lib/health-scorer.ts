/**
 * Health scorer: computes per-document and overall health scores
 * from validation results. Score = 100 - (errors * 10) - (warnings * 3).
 */
import type { HealthScore } from "../types/documents.js";

interface ValidationIssueInput {
  severity?: string;
  message: string;
}

interface ValidationResultInput {
  issues: ValidationIssueInput[];
}

/**
 * Compute health score for a single document's validation result.
 * Score: max(0, 100 - (errorCount * 10) - (warningCount * 3))
 */
function scoreDocument(result: ValidationResultInput): {
  score: number;
  topIssues: string[];
} {
  let errors = 0;
  let warnings = 0;
  const errorMessages: string[] = [];

  for (const issue of result.issues) {
    if (issue.severity === "error" || issue.severity === undefined) {
      // Treat unspecified severity as error for conservative scoring
      errors += 1;
      errorMessages.push(issue.message);
    } else if (issue.severity === "warning") {
      warnings += 1;
    }
  }

  const score = Math.max(0, 100 - errors * 10 - warnings * 3);
  const topIssues = errorMessages.slice(0, 3);

  return { score, topIssues };
}

/**
 * Compute health scores across all validated documents.
 * Overall = arithmetic average of per-doc scores.
 *
 * @param results - Array of { docType, result } pairs from validation
 */
export function computeHealthScore(
  results: { docType: string; result: ValidationResultInput }[]
): HealthScore {
  if (results.length === 0) {
    return { overall: 0, perDoc: [] };
  }

  const perDoc = results.map(({ docType, result }) => {
    const { score, topIssues } = scoreDocument(result);
    return { docType, score, topIssues };
  });

  const overall = Math.round(
    perDoc.reduce((sum, d) => sum + d.score, 0) / perDoc.length
  );

  return { overall, perDoc };
}
