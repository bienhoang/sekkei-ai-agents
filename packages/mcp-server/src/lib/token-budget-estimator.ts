/**
 * Token budget estimation for document generation.
 * Predicts output size from entity counts to advise monolithic vs progressive strategy.
 */

export type Strategy = "monolithic" | "progressive" | "split_required";

export interface SectionEstimate {
  prefix: string;
  count: number;
  token_contribution: number;
}

export interface EstimationResult {
  estimated_tokens: number;
  recommended_strategy: Strategy;
  entity_counts: Record<string, number>;
  sections_breakdown: SectionEstimate[];
}

interface CalibrationEntry {
  base: number;
  perEntity: Record<string, number>;
}

/** Calibration constants per doc type — conservative (over-estimate) */
const CALIBRATION: Record<string, CalibrationEntry> = {
  "basic-design": { base: 3000, perEntity: { SCR: 800, TBL: 600, API: 500 } },
  "detail-design": { base: 2000, perEntity: { API: 1200, CLS: 800, TBL: 400 } },
  "ut-spec": { base: 1500, perEntity: { CLS: 600, API: 400 } },
  "it-spec": { base: 1500, perEntity: { API: 800, SCR: 300 } },
  "st-spec": { base: 2000, perEntity: { SCR: 400, F: 200 } },
  "requirements": { base: 2000, perEntity: { F: 500, REQ: 300 } },
  "functions-list": { base: 1500, perEntity: { F: 300, SCR: 150 } },
  "db-design": { base: 2000, perEntity: { TBL: 700, F: 100 } },
};

const DEFAULT_CALIBRATION: CalibrationEntry = {
  base: 2000,
  perEntity: {},
};

const DEFAULT_PER_ID = 200;

// Strategy thresholds
const PROGRESSIVE_THRESHOLD = 16000;
const SPLIT_THRESHOLD = 24000;

/**
 * Estimate output tokens for a document generation call.
 * Pure function — no I/O.
 */
export function estimateOutputTokens(
  docType: string,
  entityCounts: Record<string, number>,
): EstimationResult {
  const cal = CALIBRATION[docType] ?? DEFAULT_CALIBRATION;
  const breakdown: SectionEstimate[] = [];

  let estimated = cal.base;

  // Calculate per-entity contributions
  for (const [prefix, count] of Object.entries(entityCounts)) {
    if (count <= 0) continue;
    const perUnit = cal.perEntity[prefix] ?? DEFAULT_PER_ID;
    const contribution = perUnit * count;
    estimated += contribution;
    breakdown.push({ prefix, count, token_contribution: contribution });
  }

  // Determine strategy
  let recommended_strategy: Strategy;
  if (estimated < PROGRESSIVE_THRESHOLD) {
    recommended_strategy = "monolithic";
  } else if (estimated <= SPLIT_THRESHOLD) {
    recommended_strategy = "progressive";
  } else {
    recommended_strategy = "split_required";
  }

  return {
    estimated_tokens: estimated,
    recommended_strategy,
    entity_counts: entityCounts,
    sections_breakdown: breakdown,
  };
}

/** Format estimation result as a markdown advisory block */
export function formatAdvisory(result: EstimationResult): string {
  const lines: string[] = [
    "## Token Budget Advisory",
    "",
    `**Estimated output tokens:** ${result.estimated_tokens.toLocaleString()}`,
    `**Recommended strategy:** \`${result.recommended_strategy}\``,
    "",
  ];

  if (result.sections_breakdown.length > 0) {
    lines.push(
      "| Entity | Count | Token Contribution |",
      "|--------|-------|--------------------|",
    );
    for (const s of result.sections_breakdown) {
      lines.push(`| ${s.prefix} | ${s.count} | ${s.token_contribution.toLocaleString()} |`);
    }
    lines.push("");
  }

  if (result.recommended_strategy === "monolithic") {
    lines.push("Document is small enough for single-call generation.");
  } else if (result.recommended_strategy === "progressive") {
    lines.push("Consider progressive generation (multiple stages) to avoid truncation.");
  } else {
    lines.push("**Document exceeds safe output limit.** Use split mode (manage_plan) to generate in separate phases.");
  }

  return lines.join("\n");
}
