/**
 * Manifest CRUD operations for _index.yaml document splitting.
 * All reads validate via Zod schema. All errors throw SekkeiError("MANIFEST_ERROR").
 */
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { resolve, dirname } from "node:path";
import { parse as parseYaml, stringify as stringifyYaml } from "yaml";
import { ManifestSchema } from "../types/manifest-schemas.js";
import type { Manifest, ManifestDocument, ManifestFeatureEntry, SplitDocument, Language } from "../types/documents.js";
import { SekkeiError } from "./errors.js";
import { logger } from "./logger.js";

const MAX_MANIFEST_SIZE = 50 * 1024; // 50KB

/** Read and validate a manifest file */
export async function readManifest(manifestPath: string): Promise<Manifest> {
  let raw: string;
  try {
    raw = await readFile(manifestPath, "utf-8");
  } catch {
    throw new SekkeiError("MANIFEST_ERROR", `Manifest not found: ${manifestPath}`);
  }
  if (raw.length > MAX_MANIFEST_SIZE) {
    throw new SekkeiError("MANIFEST_ERROR", "Manifest exceeds 50KB limit");
  }
  try {
    const parsed = parseYaml(raw, { maxAliasCount: 0 });
    return ManifestSchema.parse(parsed);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Invalid manifest";
    throw new SekkeiError("MANIFEST_ERROR", `Manifest validation failed: ${msg}`);
  }
}

/** Write manifest to disk as YAML */
export async function writeManifest(manifestPath: string, manifest: Manifest): Promise<void> {
  const yaml = stringifyYaml(manifest);
  await mkdir(dirname(manifestPath), { recursive: true });
  await writeFile(manifestPath, yaml, "utf-8");
  logger.info({ path: manifestPath }, "Manifest written");
}

/** Create a new empty manifest */
export async function createManifest(
  outputDir: string, project: string, language: Language
): Promise<string> {
  const manifestPath = resolve(outputDir, "_index.yaml");
  const manifest: Manifest = {
    version: "1.0",
    project,
    language,
    documents: {},
  };
  await writeManifest(manifestPath, manifest);
  return manifestPath;
}

/** Add or update a document entry in the manifest */
export async function addDocument(
  manifestPath: string, docType: string, doc: ManifestDocument
): Promise<void> {
  const manifest = await readManifest(manifestPath);
  manifest.documents[docType] = doc;
  await writeManifest(manifestPath, manifest);
}

/** Append a feature to a split document */
export async function addFeature(
  manifestPath: string, docType: string, feature: ManifestFeatureEntry
): Promise<void> {
  const manifest = await readManifest(manifestPath);
  const doc = manifest.documents[docType];
  if (!doc) {
    throw new SekkeiError("MANIFEST_ERROR", `${docType} not found in manifest`);
  }
  const existing = doc.features.findIndex(f => f.name === feature.name);
  if (existing >= 0) {
    doc.features[existing] = feature;
  } else {
    doc.features.push(feature);
  }
  await writeManifest(manifestPath, manifest);
}

/** Get ordered file paths for export merge */
export function getMergeOrder(manifest: Manifest, docType: string): string[] {
  const doc = manifest.documents[docType];
  if (!doc) return [];
  const files: string[] = [];
  for (const group of doc.merge_order) {
    if (group === "shared") {
      files.push(...doc.shared.map(s => s.file));
    } else if (group === "features") {
      files.push(...doc.features.map(f => f.file));
    }
  }
  // Skip index.md files — nav aids only, not spec content
  return files.filter(f => f !== "index.md" && !f.endsWith("/index.md"));
}

/** Get all feature file paths for a doc type */
export function getFeatureFiles(manifest: Manifest, docType: string): string[] {
  const doc = manifest.documents[docType];
  if (!doc) return [];
  return doc.features.map(f => f.file);
}

/** Add a translation reference to source manifest */
export async function addTranslation(
  manifestPath: string, lang: string, translationManifestPath: string
): Promise<void> {
  const manifest = await readManifest(manifestPath);
  const translations = manifest.translations ?? [];
  const existing = translations.findIndex(t => t.lang === lang);
  if (existing >= 0) {
    translations[existing].manifest = translationManifestPath;
  } else {
    translations.push({ lang, manifest: translationManifestPath });
  }
  manifest.translations = translations;
  await writeManifest(manifestPath, manifest);
}

/** Create a translation manifest mirroring source structure */
export function createTranslationManifest(
  source: Manifest, targetLang: Language
): Manifest {
  const translated: Manifest = {
    version: source.version,
    project: source.project,
    language: targetLang,
    source_language: source.language,
    documents: {},
  };
  for (const [key, doc] of Object.entries(source.documents)) {
    translated.documents[key] = {
      ...doc,
      shared: doc.shared.map(s => ({ ...s })),
      features: doc.features.map(f => ({ ...f })),
    };
  }
  return translated;
}
