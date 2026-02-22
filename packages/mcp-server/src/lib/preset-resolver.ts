/**
 * Preset resolver — loads YAML preset configs and applies doc overrides to templates.
 * Presets live in templates/presets/{name}.yaml
 */
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { parse as parseYaml } from "yaml";
import type { Preset } from "../types/documents.js";

export interface DocOverride {
  additional_sections?: string[];
  skip_sections?: string[];
  notes?: string;
}

export interface PresetConfig {
  name: string;
  label: string;
  keigo_level: string;
  version_scheme: "alphabetic" | "numeric";
  cover_page: "full" | "simple" | "minimal";
  required_ids: boolean;
  section_density: "full" | "core" | "minimal";
  doc_overrides?: Record<string, DocOverride>;
}

/** Load a preset config from templates/presets/{preset}.yaml */
export async function loadPreset(presetsDir: string, preset: Preset): Promise<PresetConfig> {
  const filePath = join(presetsDir, `${preset}.yaml`);
  const content = await readFile(filePath, "utf-8");
  return parseYaml(content) as PresetConfig;
}

/** Apply preset overrides to a template body string */
export function applyPreset(baseTemplate: string, docType: string, preset: PresetConfig): string {
  const overrides = preset.doc_overrides?.[docType];
  if (!overrides) return baseTemplate;

  let result = baseTemplate;

  // Append additional sections as H2 headings at end of template body
  if (overrides.additional_sections) {
    for (const section of overrides.additional_sections) {
      result += `\n\n## ${section}\n\n<!-- AI: ${section}の内容を記載してください -->\n`;
    }
  }

  // Comment out skip_sections (wrap with HTML comment)
  if (overrides.skip_sections) {
    for (const section of overrides.skip_sections) {
      const sectionRegex = new RegExp(
        `(## ${escapeRegex(section)}[\\s\\S]*?)(?=\\n## |$)`,
        "g"
      );
      result = result.replace(sectionRegex, `<!-- preset:skip $1 -->`);
    }
  }

  // Append notes as invisible comment
  if (overrides.notes) {
    result += `\n<!-- preset: ${overrides.notes} -->\n`;
  }

  return result;
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
