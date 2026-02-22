/**
 * Zod validation schemas for _index.yaml manifest files.
 * Used by manifest-manager.ts to validate on every read.
 */
import { z } from "zod";
import { LANGUAGES } from "./documents.js";

export const ManifestSharedEntrySchema = z.object({
  file: z.string().max(500),
  section: z.string().max(100),
  title: z.string().max(200),
});

export const ManifestFeatureEntrySchema = z.object({
  name: z.string().regex(/^[a-z][a-z0-9-]{1,49}$/, "Feature name must be kebab-case"),
  display: z.string().max(200),
  file: z.string().max(500),
});

export const SplitDocumentSchema = z.object({
  type: z.literal("split"),
  status: z.enum(["pending", "in-progress", "complete"]),
  shared: z.array(ManifestSharedEntrySchema),
  features: z.array(ManifestFeatureEntrySchema),
  merge_order: z.array(z.enum(["shared", "features"])).default(["shared", "features"]),
});

export const ManifestDocumentSchema = SplitDocumentSchema;

export const ManifestSchema = z.object({
  version: z.string().default("1.0"),
  project: z.string().max(200),
  language: z.enum(LANGUAGES),
  documents: z.record(z.string(), ManifestDocumentSchema),
  translations: z.array(z.object({
    lang: z.string().max(10),
    manifest: z.string().max(500),
  })).optional(),
  source_language: z.enum(LANGUAGES).optional(),
}).passthrough();

