/**
 * Native TypeScript glossary operations — replaces Python bridge for glossary CRUD.
 * Handles load, save, add, find, export (markdown), and industry import.
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { parse, stringify } from "yaml";

const __dirname = dirname(fileURLToPath(import.meta.url));
const GLOSSARIES_DIR = resolve(__dirname, "../../templates/glossaries");

const ALLOWED_INDUSTRIES = new Set([
  "finance", "medical", "manufacturing", "real-estate",
  "logistics", "retail", "insurance", "education",
  "government", "construction", "telecom", "automotive",
  "energy", "food-service", "common",
]);

export interface GlossaryTerm {
  ja: string;
  en: string;
  vi?: string;
  context?: string;
}

export interface Glossary {
  project?: string;
  terms: GlossaryTerm[];
}

/** Load glossary from YAML file, returns empty glossary if missing. */
export function loadGlossary(path: string): Glossary {
  if (!existsSync(path)) return { project: "", terms: [] };
  const raw = parse(readFileSync(path, "utf-8")) as Glossary | null;
  return raw ?? { project: "", terms: [] };
}

/** Save glossary to YAML file, creating parent dirs as needed. */
export function saveGlossary(glossary: Glossary, path: string): void {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, stringify(glossary, { lineWidth: 120 }), "utf-8");
}

/** Add or update a term in the glossary. */
export function addTerm(glossary: Glossary, ja: string, en: string, vi = "", context = ""): Glossary {
  const existing = glossary.terms.find((t) => t.ja === ja);
  if (existing) {
    existing.en = en;
    if (vi) existing.vi = vi;
    if (context) existing.context = context;
    return glossary;
  }
  glossary.terms.push({ ja, en, vi, context });
  return glossary;
}

/** Search terms by query across all language fields. */
export function findTerm(glossary: Glossary, query: string): GlossaryTerm[] {
  const q = query.toLowerCase();
  return glossary.terms.filter(
    (t) =>
      (t.ja ?? "").toLowerCase().includes(q) ||
      (t.en ?? "").toLowerCase().includes(q) ||
      (t.vi ?? "").toLowerCase().includes(q),
  );
}

/** Export glossary as a markdown table. */
export function exportAsMarkdown(glossary: Glossary): string {
  const lines = [
    `# 用語集 — ${glossary.project ?? ""}`,
    "",
    "| 日本語 | English | Tiếng Việt | コンテキスト |",
    "|--------|---------|------------|-------------|",
  ];
  for (const t of glossary.terms) {
    lines.push(`| ${t.ja ?? ""} | ${t.en ?? ""} | ${t.vi ?? ""} | ${t.context ?? ""} |`);
  }
  return lines.join("\n");
}

/** Import pre-built industry glossary into project glossary. */
export function importIndustry(
  industry: string,
  glossary: Glossary,
): { glossary: Glossary; imported: number; skipped: number } {
  if (!ALLOWED_INDUSTRIES.has(industry)) {
    throw new Error(`Unknown industry: ${industry}. Allowed: ${[...ALLOWED_INDUSTRIES].sort().join(", ")}`);
  }

  const glossaryFile = resolve(GLOSSARIES_DIR, `${industry}.yaml`);
  // Path containment check
  const realDir = resolve(GLOSSARIES_DIR);
  const realFile = resolve(glossaryFile);
  if (!realFile.startsWith(realDir + "/")) {
    throw new Error("Path traversal detected");
  }

  if (!existsSync(glossaryFile)) {
    throw new Error(`Glossary file not found: ${glossaryFile}`);
  }

  const data = parse(readFileSync(glossaryFile, "utf-8")) as Glossary;
  let imported = 0;
  let skipped = 0;
  const existingJa = new Set(glossary.terms.map((t) => t.ja));

  for (const term of data.terms ?? []) {
    const ja = term.ja ?? "";
    if (existingJa.has(ja)) {
      skipped++;
    } else {
      glossary.terms.push({ ja, en: term.en ?? "", vi: term.vi ?? "", context: term.context ?? "" });
      existingJa.add(ja);
      imported++;
    }
  }

  return { glossary, imported, skipped };
}

/** Route glossary action — single entry point matching Python CLI interface. */
export function handleGlossaryAction(
  action: string,
  data: { project_path: string; ja?: string; en?: string; vi?: string; context?: string; query?: string; industry?: string },
): Record<string, unknown> {
  const { project_path: path } = data;
  const glossary = loadGlossary(path);

  switch (action) {
    case "add": {
      addTerm(glossary, data.ja ?? "", data.en ?? "", data.vi ?? "", data.context ?? "");
      saveGlossary(glossary, path);
      return { success: true, terms_count: glossary.terms.length };
    }
    case "list":
      return { terms: glossary.terms, count: glossary.terms.length };
    case "find": {
      const results = findTerm(glossary, data.query ?? "");
      return { results, count: results.length };
    }
    case "export":
      return { content: exportAsMarkdown(glossary) };
    case "import": {
      const { imported, skipped } = importIndustry(data.industry ?? "", glossary);
      saveGlossary(glossary, path);
      return { success: true, imported, skipped };
    }
    default:
      return { error: `Unknown action: ${action}` };
  }
}
