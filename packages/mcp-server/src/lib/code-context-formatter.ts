/**
 * Format CodeContext into markdown block for injection into document generation prompt.
 */
import type { CodeContext } from "./code-analyzer.js";

export function formatCodeContext(ctx: CodeContext): string {
  const { classes, functions, apiEndpoints, dbEntities, parseErrors } = ctx;

  const allEmpty =
    classes.length === 0 &&
    functions.length === 0 &&
    apiEndpoints.length === 0 &&
    dbEntities.length === 0;

  if (allEmpty && parseErrors.length === 0) return "";

  const lines: string[] = ["## Source Code Context", ""];

  // Classes
  lines.push(`### Classes (${classes.length} found)`, "");
  if (classes.length > 0) {
    lines.push("| Class | Methods | Properties | Extends |");
    lines.push("|-------|---------|------------|---------|");
    for (const cls of classes) {
      const methods = cls.methods.map((m) => `${m.name}(${m.params}): ${m.returnType}`).join(", ") || "-";
      const props = cls.properties.map((p) => `${p.name}: ${p.type}`).join(", ") || "-";
      const ext = cls.extends ?? "-";
      lines.push(`| ${cls.name} | ${methods} | ${props} | ${ext} |`);
    }
  } else {
    lines.push("_No classes found._");
  }

  lines.push("");

  // Exported functions
  lines.push(`### Exported Functions (${functions.length} found)`, "");
  if (functions.length > 0) {
    lines.push("| Function | Params | Return | File |");
    lines.push("|----------|--------|--------|------|");
    for (const fn of functions) {
      const shortFile = fn.filePath.split("/").slice(-2).join("/");
      lines.push(`| ${fn.name} | ${fn.params || "-"} | ${fn.returnType} | ${shortFile} |`);
    }
  } else {
    lines.push("_No exported functions found._");
  }

  lines.push("");

  // API endpoints
  lines.push(`### API Endpoints (${apiEndpoints.length} found)`, "");
  if (apiEndpoints.length > 0) {
    lines.push("| Method | Path | Handler | File |");
    lines.push("|--------|------|---------|------|");
    for (const ep of apiEndpoints) {
      const shortFile = ep.filePath.split("/").slice(-2).join("/");
      lines.push(`| ${ep.method} | ${ep.path} | ${ep.handlerName} | ${shortFile} |`);
    }
  } else {
    lines.push("_No API endpoints found._");
  }

  lines.push("");

  // DB entities
  lines.push(`### Database Entities (${dbEntities.length} found)`, "");
  if (dbEntities.length > 0) {
    lines.push("| Entity | Columns | Relations |");
    lines.push("|--------|---------|-----------|");
    for (const ent of dbEntities) {
      const cols = ent.columns.map((c) => `${c.name}: ${c.type}${c.nullable ? "?" : ""}`).join(", ") || "-";
      const rels = ent.relations.map((r) => `${r.name} (${r.type})`).join(", ") || "-";
      lines.push(`| ${ent.name} | ${cols} | ${rels} |`);
    }
  } else {
    lines.push("_No database entities found._");
  }

  // Parse warnings
  if (parseErrors.length > 0) {
    lines.push("");
    lines.push("### Parse Warnings", "");
    for (const err of parseErrors) {
      lines.push(`- ${err}`);
    }
  }

  return lines.join("\n");
}
