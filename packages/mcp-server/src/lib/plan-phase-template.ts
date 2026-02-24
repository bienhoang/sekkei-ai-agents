/**
 * Phase file markdown template generator for generation plans.
 * Extracted from plan-state.ts to keep files under 200 lines.
 */
import { stringify } from "yaml";
import type { PlanPhase, PlanFeature } from "../types/plan.js";

const CMD_MAP: Record<string, string> = {
  "basic-design": "sekkei:basic-design",
  "detail-design": "sekkei:detail-design",
  "test-spec": "sekkei:test-spec",
};

function buildScopeLines(
  phase: PlanPhase,
  splitConfig: Record<string, string[]>,
  feature?: PlanFeature,
): string[] {
  const lines: string[] = [];
  if (phase.type === "shared") {
    const sections = splitConfig["shared"] ?? [];
    lines.push(`- Sections: ${sections.join(", ")}`);
  } else if (phase.type === "per-feature" && feature) {
    lines.push(`- Feature: ${feature.id} — ${feature.name}`);
    lines.push(`- Survey data: complexity=${feature.complexity}`);
  } else if (phase.type === "validation") {
    lines.push("- Sections: all generated files");
  }
  return lines;
}

function buildScopeParam(phase: PlanPhase): string {
  if (phase.type === "shared") return `scope: "shared"`;
  if (phase.type === "validation") return "manifest path";
  return `scope: "feature", feature_id: "${phase.feature_id}"`;
}

/** Render a phase file as YAML frontmatter + markdown body. */
export function renderPhaseFile(
  phase: PlanPhase,
  docType: string,
  splitConfig: Record<string, string[]>,
  feature?: PlanFeature,
): string {
  const fm = stringify({
    phase: phase.number,
    name: phase.name,
    type: phase.type,
    ...(phase.feature_id ? { feature_id: phase.feature_id } : {}),
    status: phase.status,
  });

  const cmd = phase.type === "validation"
    ? "/sekkei:validate"
    : `/${CMD_MAP[docType] ?? `sekkei:${docType}`}`;

  const scopeParam = buildScopeParam(phase);
  const scopeLines = buildScopeLines(phase, splitConfig, feature);

  const body = [
    `# Phase ${phase.number}: ${phase.name}`,
    "",
    "## Generation Command",
    `\`${cmd}\` with \`${scopeParam}\``,
    "",
    "## Scope",
    ...scopeLines,
    "",
    "## TODO",
    "- [ ] Generate document",
    "- [ ] Review output",
    "- [ ] Validate cross-references",
    "",
    "## Success Criteria",
    "- All sections present per template",
    "- Cross-reference IDs valid (F-xxx, REQ-xxx, etc.)",
    "- No placeholder content",
  ].join("\n");

  return `---\n${fm}---\n\n${body}\n`;
}
