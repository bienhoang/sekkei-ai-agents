/**
 * Prompt flows for the Sekkei init CLI.
 */

import * as p from "@clack/prompts";
import { t, opts } from "./i18n.js";
import {
  PROJECT_TYPES, DOC_LANGUAGES, KEIGO_LEVELS, PRESETS, INDUSTRIES,
  STACKS, getStackSections,
} from "./options.js";

/** Lookup label from option tuples by value */
function label(lang, items, value) {
  const L = { en: 0, ja: 1, vi: 2 };
  const item = items.find(([v]) => v === value);
  return item ? (item[L[lang] + 1] ?? item[1]) : value;
}

/** Select with "Other" — prompts for custom text when "Other" is chosen */
async function selectWithOther(lang, message, options, initialValue) {
  const knownValues = new Set(options.map((o) => o.value));
  const extra =
    initialValue && !knownValues.has(initialValue)
      ? [{ value: initialValue, label: initialValue }]
      : [];
  const allOpts = [
    ...options, ...extra, { value: "__other__", label: t(lang, "other") },
  ];
  const selected = await p.select({ message, options: allOpts, initialValue });
  if (p.isCancel(selected)) return selected;
  if (selected !== "__other__") return selected;
  const custom = await p.text({
    message: t(lang, "other_hint"),
    validate: (v) => (!v ? t(lang, "other_required") : undefined),
  });
  return custom;
}

/** Multiselect with "Other" — merges selections + comma-separated custom values */
async function multiselectWithOther(lang, message, options, prevValues) {
  const allOpts = [
    ...options, { value: "__other__", label: t(lang, "other") },
  ];
  const selected = await p.multiselect({
    message,
    options: allOpts,
    required: false,
    initialValues: prevValues?.length > 0 ? prevValues : undefined,
  });
  if (p.isCancel(selected)) return selected;
  const hasOther = selected.includes("__other__");
  const filtered = selected.filter((v) => v !== "__other__");
  if (!hasOther) return filtered;
  const custom = await p.text({
    message: t(lang, "other_multi_hint"),
    placeholder: "e.g. Redis, gRPC",
  });
  if (p.isCancel(custom)) return custom;
  if (custom) {
    filtered.push(...custom.split(",").map((s) => s.trim()).filter(Boolean));
  }
  return filtered;
}

/** First prompt — CLI language selection (labels shown in native language) */
export async function askLanguage() {
  return p.select({
    message: "Language / 言語 / Ngôn ngữ",
    options: [
      { value: "en", label: "English" },
      { value: "ja", label: "日本語" },
      { value: "vi", label: "Tiếng Việt" },
    ],
  });
}

/** Project basics — name and type (prev = previous answers for redo) */
export async function askProject(lang, prev) {
  const name = await p.text({
    message: t(lang, "project_name"),
    placeholder: "my-project",
    initialValue: prev?.name,
    validate: (v) => (!v ? t(lang, "project_name_required") : undefined),
  });
  if (p.isCancel(name)) return name;

  const type = await selectWithOther(
    lang, t(lang, "project_type"), opts(lang, PROJECT_TYPES), prev?.type,
  );
  if (p.isCancel(type)) return type;

  return { name, type };
}

/** Tech stack — multi-select categories with "Other", merged to flat array */
export async function askStacks(lang, projectType, prevStacks) {
  const result = [];
  const sections = getStackSections(projectType);
  const hint = t(lang, "stack_hint");

  for (const section of sections) {
    const selected = await multiselectWithOther(
      lang,
      `${t(lang, `stack_${section}`)}  (${hint})`,
      STACKS[section],
      prevStacks,
    );
    if (p.isCancel(selected)) return selected;
    result.push(...selected);
  }

  return result;
}

/** Document options — language, keigo, preset, industry, output dir (prev for redo) */
export async function askDocOptions(lang, presetValue, prev) {
  const language = await p.select({
    message: t(lang, "doc_language"),
    options: opts(lang, DOC_LANGUAGES),
    initialValue: prev?.language ?? lang,
  });
  if (p.isCancel(language)) return language;

  const keigo = await p.select({
    message: t(lang, "keigo_level"),
    options: opts(lang, KEIGO_LEVELS),
    initialValue: prev?.keigo,
  });
  if (p.isCancel(keigo)) return keigo;

  let preset;
  if (presetValue && ["enterprise", "standard", "agile"].includes(presetValue)) {
    preset = presetValue;
  } else {
    preset = await p.select({
      message: t(lang, "preset"),
      options: opts(lang, PRESETS),
      initialValue: prev?.preset,
    });
    if (p.isCancel(preset)) return preset;
  }

  const industry = await selectWithOther(
    lang, t(lang, "industry"), opts(lang, INDUSTRIES), prev?.industry,
  );
  if (p.isCancel(industry)) return industry;

  const outputDir = await p.text({
    message: t(lang, "output_dir"),
    placeholder: "./output",
    initialValue: prev?.outputDir ?? "./output",
  });
  if (p.isCancel(outputDir)) return outputDir;

  return { language, keigo, preset, industry, outputDir };
}

/**
 * Show config summary and let user confirm or redo sections.
 * Returns "ok" if confirmed, or the section name to redo.
 */
export async function showSummary(lang, project, stack, docOpts) {
  const lines = [
    `${t(lang, "section_project")}:`,
    `  ${t(lang, "project_name")}: ${project.name}`,
    `  ${t(lang, "project_type")}: ${label(lang, PROJECT_TYPES, project.type)}`,
    "",
    `${t(lang, "section_stack")}:`,
    `  ${stack.length > 0 ? stack.join(", ") : "—"}`,
    "",
    `${t(lang, "section_doc")}:`,
    `  ${t(lang, "doc_language")}: ${label(lang, DOC_LANGUAGES, docOpts.language)}`,
    `  ${t(lang, "keigo_level")}: ${label(lang, KEIGO_LEVELS, docOpts.keigo)}`,
    `  ${t(lang, "preset")}: ${label(lang, PRESETS, docOpts.preset)}`,
    `  ${t(lang, "industry")}: ${label(lang, INDUSTRIES, docOpts.industry)}`,
    `  ${t(lang, "output_dir")}: ${docOpts.outputDir}`,
  ];

  p.note(lines.join("\n"), t(lang, "summary_title"));

  const action = await p.select({
    message: t(lang, "summary_confirm"),
    options: [
      { value: "ok", label: "✓ OK" },
      { value: "project", label: t(lang, "section_project") },
      { value: "stack", label: t(lang, "section_stack") },
      { value: "doc", label: t(lang, "section_doc") },
    ],
  });

  if (p.isCancel(action)) return "cancel";
  return action; // "ok" | "project" | "stack" | "doc"
}
