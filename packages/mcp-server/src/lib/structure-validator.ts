/**
 * Validate numbered documentation directory structure.
 * Checks: required files/dirs, index.md presence, kebab-case folders, filename rules.
 */
import { access, readdir } from "node:fs/promises";
import { join } from "node:path";

export interface StructureIssue {
  type: "error" | "warning";
  message: string;
}

const REQUIRED_FILES = [
  "10-glossary.md",
];
const REQUIRED_DIRS = [
  "01-rfp", "02-requirements", "03-system", "04-functions-list", "05-features",
  "06-data", "07-operations", "08-test", "09-ui",
];
const VERSION_SUFFIX_RE = /-(v\d+|final|last|old|new|copy)\./i;
const NON_ASCII_RE = /[^\x00-\x7F]/;
const KEBAB_RE = /^[a-z][a-z0-9-]+$/;

async function exists(p: string): Promise<boolean> {
  try { await access(p); return true; } catch { return false; }
}

export async function validateNumberedStructure(dir: string): Promise<StructureIssue[]> {
  const issues: StructureIssue[] = [];

  for (const f of REQUIRED_FILES) {
    if (!await exists(join(dir, f))) {
      issues.push({ type: "error", message: `Missing required file: ${f}` });
    }
  }

  for (const d of REQUIRED_DIRS) {
    const dPath = join(dir, d);
    if (!await exists(dPath)) {
      issues.push({ type: "error", message: `Missing required directory: ${d}/` });
      continue;
    }
    if (!await exists(join(dPath, "index.md"))) {
      issues.push({ type: "error", message: `Missing index.md in ${d}/` });
    }
  }

  // Feature folder checks
  const featuresDir = join(dir, "05-features");
  if (await exists(featuresDir)) {
    try {
      const entries = await readdir(featuresDir, { withFileTypes: true });
      for (const entry of entries) {
        if (!entry.isDirectory()) continue;
        if (!KEBAB_RE.test(entry.name)) {
          issues.push({ type: "error", message: `Feature folder not kebab-case: 05-features/${entry.name}` });
        }
        if (!await exists(join(featuresDir, entry.name, "index.md"))) {
          issues.push({ type: "error", message: `Missing index.md in 05-features/${entry.name}/` });
        }
      }
    } catch {
      issues.push({ type: "error", message: `Cannot read 05-features/ directory` });
    }
  }

  // Top-level filename rules
  try {
    const topEntries = await readdir(dir, { withFileTypes: true });
    for (const entry of topEntries) {
      if (!entry.isFile() || !entry.name.endsWith(".md")) continue;
      if (VERSION_SUFFIX_RE.test(entry.name)) {
        issues.push({ type: "error", message: `Version suffix forbidden: ${entry.name}` });
      }
      if (NON_ASCII_RE.test(entry.name)) {
        issues.push({ type: "error", message: `Non-ASCII filename: ${entry.name}` });
      }
      if (!/^\d{2}-/.test(entry.name) && entry.name !== "README.md") {
        issues.push({ type: "warning", message: `Unnumbered top-level file: ${entry.name}` });
      }
    }
  } catch {
    issues.push({ type: "error", message: `Cannot read output directory: ${dir}` });
  }

  return issues;
}
