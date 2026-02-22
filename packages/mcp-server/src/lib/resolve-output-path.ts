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
  if (docType === "overview")            return "01-overview.md";
  if (docType === "requirements")        return "02-requirements.md";
  if (docType === "functions-list")      return "04-functions-list.md";
  if (docType === "migration-design")    return "06-data/";
  if (docType === "operation-design")    return "07-operations/";
  if (docType === "crud-matrix")         return "03-system/crud-matrix.md";
  if (docType === "traceability-matrix") return "08-test/traceability-matrix.md";

  if (docType === "basic-design") {
    if (scope === "shared")  return "03-system/";
    if (scope === "feature" && featureName) return `05-features/${featureName}/basic-design.md`;
  }
  if (docType === "detail-design") {
    if (scope === "feature" && featureName) return `05-features/${featureName}/detail-design.md`;
  }
  if (docType === "test-spec") {
    if (scope === "shared")  return "08-test/";
    if (scope === "feature" && featureName) return `05-features/${featureName}/test-spec.md`;
  }
  return undefined;
}
