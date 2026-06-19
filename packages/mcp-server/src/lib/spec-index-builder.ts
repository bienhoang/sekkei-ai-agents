/**
 * Builds the agent spec-index — an ID-keyed projection of the existing
 * `validate_chain` traceability matrix, enriched with Source-file, Status, and
 * JA-title columns, for the tool-only `.sekkei-agent/spec-index.md`.
 *
 * This is NOT a parallel matrix renderer: it reuses `buildTraceabilityMatrix`
 * (origin-gated) and joins per-ID Source / per-doc Status + Title. No anchors
 * (table-row IDs collapse + renderers slugify differently) — the agent greps the
 * ID inside Source. `reconcile` diffs the current ID set vs the prior file and
 * proposes an advisory next-free-ID; it is read-only w.r.t. the source docs.
 *
 * Pure logic (render, diff, next-free, parsing) lives in spec-index-render.ts.
 */
import { readFile, writeFile } from "node:fs/promises";
import { resolve, dirname, join } from "node:path";
import { parse as parseYaml } from "yaml";
import { loadChainDocs, buildTraceabilityMatrix } from "./cross-ref-linker.js";
import { readDocumentFrontmatter } from "./frontmatter-reader.js";
import { listChainDocs, writeConsumptionArtifacts, AGENT_DIR_NAME } from "./consumption-index.js";
import {
  allIdsIn,
  compareIds,
  computeReconcile,
  parsePriorIds,
  renderSpecIndex,
  type PartialInfo,
  type ReconcileReport,
  type SpecIndexData,
  type SpecIndexEntry,
} from "./spec-index-render.js";
import type { ProjectConfig, TraceabilityEntry } from "../types/documents.js";

const SPEC_INDEX_FILE = "spec-index.md";

async function readConfig(configPath: string): Promise<ProjectConfig> {
  return (parseYaml(await readFile(resolve(configPath), "utf-8")) ?? {}) as ProjectConfig;
}

/** PARTIAL when fewer docs are present than configured, or any is non-complete. */
function computePartial(
  chain: Record<string, { status?: string } | undefined>,
  docs: Map<string, string>,
): PartialInfo {
  const configured = Object.entries(chain).filter(
    ([, v]) => v && typeof v === "object" && ("output" in v || "system_output" in v || "features_output" in v),
  );
  const present = configured.filter(([key]) => docs.has(key.replace(/_/g, "-"))).length;
  const anyPending = configured.some(([, v]) => {
    const s = (v as { status?: string }).status;
    return s && s !== "complete";
  });
  return { present, total: configured.length, isPartial: present < configured.length || anyPending };
}

/** Build the enriched spec-index entries from the live chain + config. */
export async function buildSpecIndexData(configPath: string): Promise<SpecIndexData> {
  const docs = await loadChainDocs(configPath);
  const matrix: TraceabilityEntry[] = buildTraceabilityMatrix(docs);
  const config = await readConfig(configPath);
  const root = dirname(resolve(configPath));
  const chain = (config.chain ?? {}) as Record<string, { status?: string } | undefined>;

  // Per concrete file: ids + frontmatter status + JA title (reuse Phase-1 discovery).
  // Use an exact-token ID set (not substring includes) so SCR-001 is not mis-attributed
  // to a sibling file that only contains SCR-0010.
  const fileInfos: { docType: string; relPath: string; title: string; status?: string; ids: Set<string> }[] = [];
  for (const ref of await listChainDocs(configPath)) {
    const content = await readFile(resolve(root, ref.relPath), "utf-8").catch(() => "");
    const fm = await readDocumentFrontmatter(resolve(root, ref.relPath));
    fileInfos.push({ docType: ref.docType, relPath: ref.relPath, title: ref.title, status: fm.status, ids: allIdsIn(content) });
  }

  const entries: SpecIndexEntry[] = matrix.map((e) => {
    const candidates = fileInfos.filter((f) => f.docType === e.doc_type);
    const owner = candidates.find((f) => f.ids.has(e.id)) ?? candidates[0];
    const configStatus = chain[e.doc_type.replace(/-/g, "_")]?.status;
    return {
      id: e.id,
      type: e.doc_type,
      titleJa: owner?.title ?? e.doc_type,
      source: owner?.relPath ?? e.doc_type,
      status: owner?.status ?? configStatus ?? "—",
      traced: e.downstream_refs.length > 0,
    };
  });

  entries.sort((a, b) => compareIds(a.id, b.id) || a.type.localeCompare(b.type));

  // Non-origin IDs: present anywhere but absent from the origin-gated matrix.
  const matrixIds = new Set(entries.map((e) => e.id));
  const allIds = new Set<string>();
  for (const content of docs.values()) for (const id of allIdsIn(content)) allIds.add(id);
  const nonOrigin = [...allIds].filter((id) => !matrixIds.has(id)).sort(compareIds);

  // Duplicate origin entries (same ID defined in >1 doc type).
  const counts = new Map<string, number>();
  for (const e of entries) counts.set(e.id, (counts.get(e.id) ?? 0) + 1);
  const duplicates = [...counts].filter(([, n]) => n > 1).map(([id]) => id).sort(compareIds);

  return { entries, nonOrigin, duplicates, partial: computePartial(chain, docs) };
}

/**
 * Emit the full agent artifact set: llms.txt (Phase 1) + spec-index.md.
 * Reuses `writeConsumptionArtifacts` (which truncate-rewrites `.sekkei-agent/`)
 * as the base, then adds spec-index.md into the freshly-reset dir.
 */
export async function writeAgentArtifacts(configPath: string): Promise<{ agentDir: string; data: SpecIndexData }> {
  const agentDir = await writeConsumptionArtifacts(configPath); // reset dir + write llms.txt
  const data = await buildSpecIndexData(configPath);
  await writeFile(join(agentDir, SPEC_INDEX_FILE), renderSpecIndex(data), "utf-8");
  return { agentDir, data };
}

/** Read the prior spec-index.md ID universe (read-only) before it is overwritten. */
async function readPriorSpecIndexIds(configPath: string): Promise<Set<string>> {
  const prior = join(dirname(resolve(configPath)), AGENT_DIR_NAME, SPEC_INDEX_FILE);
  const content = await readFile(prior, "utf-8").catch(() => "");
  return parsePriorIds(content);
}

/**
 * Reconcile: diff the live ID set vs the prior spec-index.md, then overwrite it.
 * Read-only w.r.t. source docs — never writes IDs back (avoids TOCTOU). The
 * advisory next-free-ID is a suggestion only (IDs are still LLM-minted).
 */
export async function reconcileAgentIndex(configPath: string): Promise<ReconcileReport & { agentDir: string }> {
  const priorIds = await readPriorSpecIndexIds(configPath); // BEFORE the dir is reset
  const { agentDir, data } = await writeAgentArtifacts(configPath);
  return { ...computeReconcile(data, priorIds), agentDir };
}
