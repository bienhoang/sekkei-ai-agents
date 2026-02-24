/**
 * Map (doc_type, scope, feature_name) to a numbered output path suggestion.
 * Pure function — no I/O. Used by generate.ts for path hints in tool output.
 */
import type { DocType } from "../types/documents.js";

export function resolveOutputPath(
  docType: DocType,
  scope?: "shared" | "feature",
  featureName?: string,
): string | undefined {
  // Requirements phase — nested under 02-requirements/
  if (docType === "requirements")        return "02-requirements/requirements.md";
  if (docType === "nfr")                 return "02-requirements/nfr.md";
  if (docType === "project-plan")        return "02-requirements/project-plan.md";
  if (docType === "functions-list")      return "04-functions-list/functions-list.md";

  // Design phase
  if (docType === "basic-design") {
    if (scope === "shared")  return "03-system/";
    if (scope === "feature" && featureName) return `05-features/${featureName}/basic-design.md`;
    return "03-system/basic-design.md";
  }
  if (docType === "security-design")     return "03-system/security-design.md";
  if (docType === "detail-design") {
    if (scope === "shared")  return "03-system/";
    if (scope === "feature" && featureName) return `05-features/${featureName}/detail-design.md`;
    return "03-system/detail-design.md";
  }

  // Test phase — nested under 08-test/
  if (docType === "test-plan")           return "08-test/test-plan.md";
  if (docType === "ut-spec") {
    if (scope === "feature" && featureName) return `05-features/${featureName}/ut-spec.md`;
    return "08-test/ut-spec.md";
  }
  if (docType === "it-spec") {
    if (scope === "feature" && featureName) return `05-features/${featureName}/it-spec.md`;
    return "08-test/it-spec.md";
  }
  if (docType === "st-spec")             return "08-test/st-spec.md";
  if (docType === "uat-spec")            return "08-test/uat-spec.md";

  // Supplementary
  if (docType === "crud-matrix")         return "03-system/crud-matrix.md";
  if (docType === "traceability-matrix") return "08-test/traceability-matrix.md";
  if (docType === "sitemap")             return "03-system/sitemap.md";
  if (docType === "migration-design")    return "06-data/migration-design.md";
  if (docType === "operation-design")    return "07-operations/operation-design.md";

  return undefined;
}
