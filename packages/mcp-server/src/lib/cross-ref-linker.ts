/**
 * Cross-reference linker: builds ID graph across the full document chain,
 * detects orphaned/missing IDs, and generates a traceability matrix.
 */
import { readFile, readdir } from "node:fs/promises";
import { resolve, dirname } from "node:path";
import { parse as parseYaml } from "yaml";
import { extractAllIds } from "./id-extractor.js";
import { SekkeiError } from "./errors.js";
import type { ProjectConfig, ChainRefReport, ChainLinkReport, TraceabilityEntry } from "../types/documents.js";

/** Ordered chain link pairs */
const CHAIN_PAIRS: [string, string][] = [
  ["functions-list", "requirements"],
  ["requirements", "basic-design"],
  ["basic-design", "detail-design"],
  ["detail-design", "test-spec"],
];

/** ID prefix → doc type that defines it */
const ID_ORIGIN: Record<string, string> = {
  F: "functions-list",
  REQ: "requirements",
  NFR: "requirements",
  SCR: "basic-design",
  TBL: "basic-design",
  API: "basic-design",
  CLS: "detail-design",
  DD: "detail-design",
  UT: "test-spec",
  IT: "test-spec",
  ST: "test-spec",
  EV: "test-evidence",
  MTG: "meeting-minutes",
  ADR: "decision-record",
  IF: "interface-spec",
  PG: "sitemap",
};

/** Standard ID regex — same pattern as id-extractor.ts */
const ID_PATTERN = /\b(F|REQ|NFR|SCR|TBL|API|CLS|DD|TS|UT|IT|ST|UAT|OP|MIG|EV|MTG|ADR|IF|PG)-(\d{1,4})\b/g;

/** Validate configPath: no path traversal, must end in .yaml/.yml */
function validateConfigPath(configPath: string): void {
  if (configPath.includes("..")) {
    throw new SekkeiError("CONFIG_ERROR", "config_path must not contain '..'");
  }
  if (!/\.ya?ml$/i.test(configPath)) {
    throw new SekkeiError("CONFIG_ERROR", "config_path must end in .yaml or .yml");
  }
}

/** Read all .md files from a directory, concatenated */
async function readDirMarkdown(dirPath: string): Promise<string> {
  try {
    const entries = await readdir(dirPath, { recursive: true });
    const parts: string[] = [];
    for (const entry of entries) {
      if (typeof entry === "string" && entry.endsWith(".md")) {
        try {
          const content = await readFile(resolve(dirPath, entry), "utf-8");
          if (content.length <= 500_000) parts.push(content);
        } catch {
          // skip unreadable files
        }
      }
    }
    return parts.join("\n\n");
  } catch {
    return "";
  }
}

/** Load chain docs from config, returning Map<docType, concatenated content> */
export async function loadChainDocs(configPath: string): Promise<Map<string, string>> {
  validateConfigPath(configPath);
  const absConfig = resolve(configPath);
  let raw: string;
  try {
    raw = await readFile(absConfig, "utf-8");
  } catch {
    throw new SekkeiError("CONFIG_ERROR", `Cannot read config: ${configPath}`);
  }
  const config = parseYaml(raw) as ProjectConfig;
  const base = dirname(absConfig);
  const docs = new Map<string, string>();

  const chain = config.chain;
  if (!chain) return docs;

  // Single-file entries
  const singleEntries: [string, { output?: string }][] = [
    ["functions-list", chain.functions_list],
    ["requirements", chain.requirements],
    ["overview", chain.overview],
  ];
  if (chain.operation_design) singleEntries.push(["operation-design", chain.operation_design]);
  if (chain.migration_design) singleEntries.push(["migration-design", chain.migration_design]);

  for (const [docType, entry] of singleEntries) {
    if (!entry?.output) continue;
    try {
      const content = await readFile(resolve(base, entry.output), "utf-8");
      if (content.length <= 500_000) docs.set(docType, content);
    } catch {
      // skip missing
    }
  }

  // Split entries
  const splitEntries: [string, { system_output?: string; features_output?: string; global_output?: string }][] = [
    ["basic-design", chain.basic_design],
    ["detail-design", chain.detail_design],
    ["test-spec", chain.test_spec],
  ];

  for (const [docType, entry] of splitEntries) {
    if (!entry) continue;
    const parts: string[] = [];
    for (const dirKey of ["system_output", "features_output", "global_output"] as const) {
      const dirPath = entry[dirKey];
      if (dirPath) {
        const content = await readDirMarkdown(resolve(base, dirPath));
        if (content) parts.push(content);
      }
    }
    if (parts.length > 0) docs.set(docType, parts.join("\n\n"));
  }

  return docs;
}

type IdGraph = Map<string, { defined: Set<string>; referenced: Set<string> }>;

/** Collect all standard Sekkei IDs from content as a Set */
function extractStandardIds(content: string): Set<string> {
  const ids = new Set<string>();
  for (const match of content.matchAll(new RegExp(ID_PATTERN.source, "g"))) {
    ids.add(match[0]);
  }
  return ids;
}

/** Build ID graph: for each doc, collect defined IDs and all referenced IDs.
 *  Both "defined" and "referenced" are all standard IDs present in the doc —
 *  context (origin doc type) determines which are truly "defined" vs "referenced". */
export function buildIdGraph(docs: Map<string, string>): IdGraph {
  const graph: IdGraph = new Map();
  for (const [docType, content] of docs) {
    const allIds = extractStandardIds(content);
    // Also include custom-prefix IDs in the defined set
    const customIds = extractAllIds(content);
    const defined = new Set([...allIds, ...customIds]);
    graph.set(docType, { defined, referenced: allIds });
  }
  return graph;
}

/** Build traceability matrix: for each defined ID, collect downstream references */
export function buildTraceabilityMatrix(docs: Map<string, string>): TraceabilityEntry[] {
  const matrix: TraceabilityEntry[] = [];
  const docOrder = ["functions-list", "requirements", "basic-design", "detail-design", "test-spec"];

  for (const [docType, content] of docs) {
    const defined = extractStandardIds(content);
    for (const id of defined) {
      // Only trace IDs that originate from this doc type
      const prefix = id.split("-")[0];
      if (ID_ORIGIN[prefix] !== docType) continue;

      // Find the position of this docType in the chain
      const originIdx = docOrder.indexOf(docType);
      const downstreamRefs: string[] = [];

      // Check all downstream docs for references to this ID
      for (let i = originIdx + 1; i < docOrder.length; i++) {
        const downDoc = docOrder[i];
        const downContent = docs.get(downDoc);
        if (downContent && downContent.includes(id)) {
          downstreamRefs.push(downDoc);
        }
      }

      matrix.push({ id, doc_type: docType, downstream_refs: downstreamRefs });
    }
  }

  // Sort by ID for deterministic output
  matrix.sort((a, b) => a.id.localeCompare(b.id));
  return matrix;
}

/** Analyze the ID graph for each chain pair, producing orphaned/missing IDs */
export function analyzeGraph(graph: IdGraph, docs: Map<string, string>): ChainRefReport {
  const links: ChainLinkReport[] = [];
  const allOrphaned: ChainRefReport["orphaned_ids"] = [];
  const allMissing: ChainRefReport["missing_ids"] = [];

  for (const [upstreamType, downstreamType] of CHAIN_PAIRS) {
    const upNode = graph.get(upstreamType);
    const downNode = graph.get(downstreamType);

    // Skip pairs where either doc is absent
    if (!upNode || !downNode) continue;

    const link: ChainLinkReport = {
      upstream: upstreamType,
      downstream: downstreamType,
      orphaned_ids: [],
      missing_ids: [],
    };

    // Orphaned: defined in upstream but not referenced in downstream
    for (const id of upNode.defined) {
      const prefix = id.split("-")[0];
      // Only check IDs that originate from this upstream doc
      if (ID_ORIGIN[prefix] !== upstreamType) continue;
      if (!downNode.referenced.has(id)) {
        link.orphaned_ids.push(id);
        allOrphaned.push({ id, defined_in: upstreamType, expected_in: downstreamType });
      }
    }

    // Missing: referenced in downstream with upstream prefix but not defined upstream
    for (const id of downNode.referenced) {
      const prefix = id.split("-")[0];
      if (ID_ORIGIN[prefix] !== upstreamType) continue;
      if (!upNode.defined.has(id)) {
        link.missing_ids.push(id);
        allMissing.push({ id, referenced_in: downstreamType, expected_from: upstreamType });
      }
    }

    links.push(link);
  }

  const traceability_matrix = buildTraceabilityMatrix(docs);
  const suggestions = generateSuggestions({ links, orphaned_ids: allOrphaned, missing_ids: allMissing, traceability_matrix });

  return { links, orphaned_ids: allOrphaned, missing_ids: allMissing, traceability_matrix, suggestions };
}

/** Generate human-readable fix suggestions */
export function generateSuggestions(report: Omit<ChainRefReport, "suggestions">): string[] {
  const suggestions: string[] = [];
  for (const o of report.orphaned_ids) {
    suggestions.push(`${o.id} defined in ${o.defined_in} but not referenced in ${o.expected_in}`);
  }
  for (const m of report.missing_ids) {
    suggestions.push(`${m.id} referenced in ${m.referenced_in} but not defined in ${m.expected_from}`);
  }
  return suggestions;
}

/** Main entry point: load docs, build graph, analyze, return full report */
export async function validateChain(configPath: string): Promise<ChainRefReport> {
  const docs = await loadChainDocs(configPath);
  const graph = buildIdGraph(docs);
  return analyzeGraph(graph, docs);
}
