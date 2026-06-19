/**
 * Consumption-side handoff artifacts for downstream coding agents.
 *
 * Emits a tool-only `.sekkei-agent/llms.txt` (llmstxt.org format) that maps the
 * generated JP V-model spec-set with a per-doc 1-line purpose and a 4-step
 * reading protocol, so an agent can navigate the chain without reading every doc.
 *
 * Discovery reuses `loadChainDocs` (dual-mode aware) to decide which doc TYPES
 * exist; concrete file relpaths come from `config.chain[].output` (and the
 * `system_output`/`features_output` dirs for per-feature docs). Output dir is
 * `.sekkei-agent/` (leading dot) to avoid colliding with `_index.yaml`
 * split-manifests and to signal "tool-only, not a human deliverable".
 */
import { readFile, writeFile, mkdir, rm, readdir, stat } from "node:fs/promises";
import { resolve, dirname, join, relative, basename } from "node:path";
import { parse as parseYaml } from "yaml";
import { loadChainDocs } from "./cross-ref-linker.js";
import { DOC_PURPOSE } from "./consumption-doc-purpose.js";
import type { ProjectConfig } from "../types/documents.js";

/** Tool-only artifact directory name. Leading dot keeps it out of `_index*` globs. */
export const AGENT_DIR_NAME = ".sekkei-agent";

export interface DocRef {
  docType: string;
  /** JA title from the doc's first H1 heading; falls back to docType. */
  title: string;
  /** Path relative to project root (the dir containing sekkei.config.yaml). */
  relPath: string;
  /** Feature folder name, set when a docType resolves to multiple per-feature files. */
  feature?: string;
}

interface ChainEntry {
  output?: string;
  system_output?: string;
  features_output?: string;
}

/** Read + parse the project config. */
async function readConfig(configPath: string): Promise<ProjectConfig> {
  const raw = await readFile(resolve(configPath), "utf-8");
  return (parseYaml(raw) ?? {}) as ProjectConfig;
}

/** First markdown H1 heading, used as the doc's JA title. */
function firstH1(content: string): string | undefined {
  const m = content.match(/^#\s+(.+?)\s*$/m);
  return m ? m[1].trim() : undefined;
}

async function isDirectory(abs: string): Promise<boolean> {
  try {
    return (await stat(abs)).isDirectory();
  } catch {
    return false;
  }
}

/** Recursively collect files named exactly `fileName` under `dir`. */
async function findDocFiles(dir: string, fileName: string): Promise<string[]> {
  const out: string[] = [];
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return out;
  }
  for (const e of entries) {
    const full = join(dir, e.name);
    if (e.isDirectory()) out.push(...(await findDocFiles(full, fileName)));
    else if (e.name === fileName) out.push(full);
  }
  return out;
}

/**
 * Resolve a docType to one or more concrete doc files. Single-file docs use the
 * `output` path verbatim. Dir-valued / per-feature docs (whose `output` is a dir,
 * or which use `system_output`/`features_output`) are expanded by finding files
 * named `<docType>.md` inside those dirs — precise, so a shared dir like
 * `03-system/` does NOT pull in sibling doc types.
 */
async function resolveDocRefs(
  root: string,
  docType: string,
  content: string,
  entry: ChainEntry | undefined,
): Promise<DocRef[]> {
  const candidates = [entry?.output, entry?.system_output, entry?.features_output].filter(
    (c): c is string => Boolean(c),
  );
  const fileName = `${docType}.md`;
  const refs: DocRef[] = [];
  const seen = new Set<string>();

  for (const cand of candidates) {
    const abs = resolve(root, cand);
    if (await isDirectory(abs)) {
      for (const file of await findDocFiles(abs, fileName)) {
        const rel = relative(root, file);
        if (seen.has(rel)) continue;
        seen.add(rel);
        const fileContent = await readFile(file, "utf-8").catch(() => "");
        refs.push({ docType, title: firstH1(fileContent) ?? docType, relPath: rel, feature: basename(dirname(file)) });
      }
    } else if (cand.endsWith(".md") && !seen.has(cand)) {
      seen.add(cand);
      refs.push({ docType, title: firstH1(content) ?? docType, relPath: cand });
    }
  }

  if (refs.length === 0) {
    // loadChainDocs found content for this docType but no concrete file resolved
    // (e.g. unusual config) — fall back to the first configured path or the docType.
    refs.push({ docType, title: firstH1(content) ?? docType, relPath: candidates[0] ?? docType });
  }
  return refs;
}

/**
 * List the chain docs that actually exist on disk, with title + relpath.
 * Existence + dual-mode discovery come from `loadChainDocs`; concrete file
 * relpaths from config. Per-feature docs expand to one entry per feature file.
 * Sorted by relpath (numbered dirs 02-/03-/… yield natural reading order).
 */
export async function listChainDocs(configPath: string): Promise<DocRef[]> {
  const docs = await loadChainDocs(configPath);
  const config = await readConfig(configPath);
  const root = dirname(resolve(configPath));
  const chain = (config.chain ?? {}) as Record<string, ChainEntry | undefined>;

  const refs: DocRef[] = [];
  for (const [docType, content] of docs) {
    const entry = chain[docType.replace(/-/g, "_")];
    refs.push(...(await resolveDocRefs(root, docType, content, entry)));
  }

  // Disambiguate titles when a docType resolves to multiple per-feature files.
  const counts = new Map<string, number>();
  for (const r of refs) counts.set(r.docType, (counts.get(r.docType) ?? 0) + 1);
  for (const r of refs) {
    if ((counts.get(r.docType) ?? 0) > 1 && r.feature) r.title = `${r.title} (${r.feature})`;
  }

  refs.sort((a, b) => a.relPath.localeCompare(b.relPath) || a.docType.localeCompare(b.docType));
  return refs;
}

/** Build the llmstxt.org-format index string with the 4-step protocol folded in. */
export async function generateLlmsTxt(configPath: string): Promise<string> {
  const refs = await listChainDocs(configPath);
  const config = await readConfig(configPath);
  const projectName = config.project?.name ?? "Sekkei Project";

  const protocol =
    "Agent reading protocol for this Sekkei V-model spec-set. " +
    "All paths are relative to the project root (the directory containing sekkei.config.yaml). " +
    "(1) Read this index to map the doc-set. " +
    "(2) Map your current phase to its IDs — REQ→requirements, F→functions-list, " +
    "SCR/TBL/API→basic-design, CLS→detail-design, UT/IT/ST/UAT→test specs. " +
    "(3) Open ONLY the docs owning the IDs for your current task; grep the ID inside the file. " +
    "(4) Cross-check upstream/downstream references for gaps before implementing. " +
    "Tool-generated — do not edit by hand.";

  const lines: string[] = [`# ${projectName}`, "", `> ${protocol}`, "", "## Docs", ""];
  if (refs.length === 0) {
    lines.push("_(No chain documents generated yet.)_");
  } else {
    for (const ref of refs) {
      const purpose = DOC_PURPOSE[ref.docType] ?? `${ref.docType} 文書`;
      lines.push(`- [${ref.title}](${ref.relPath}): ${purpose}`);
    }
  }
  return lines.join("\n") + "\n";
}

/**
 * Write all consumption artifacts into `<project-root>/.sekkei-agent/`.
 * Idempotent: truncate-rewrites the whole dir so stale entries (from deleted or
 * renamed docs) are pruned. Returns the absolute artifact dir for tool output.
 */
export async function writeConsumptionArtifacts(configPath: string): Promise<string> {
  const projectRoot = dirname(resolve(configPath));
  const agentDir = join(projectRoot, AGENT_DIR_NAME);

  await rm(agentDir, { recursive: true, force: true });
  await mkdir(agentDir, { recursive: true });

  const llms = await generateLlmsTxt(configPath);
  await writeFile(join(agentDir, "llms.txt"), llms, "utf-8");

  return agentDir;
}
