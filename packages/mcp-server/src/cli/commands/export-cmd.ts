/**
 * CLI export command — wraps handleExportDocument tool handler.
 * Named export-cmd to avoid shadowing the JS `export` keyword.
 */
import { defineCommand } from "citty";
import { handleExportDocument } from "../../tools/export.js";

export const exportCommand = defineCommand({
  meta: { name: "export", description: "Export a specification document to xlsx, pdf, docx, or gsheet" },
  args: {
    format: { type: "string", required: true, description: "Export format: xlsx, pdf, docx, gsheet" },
    "doc-type": { type: "string", required: true, description: "Document type (e.g. requirements)" },
    output: { type: "string", description: "Output file path (.xlsx/.pdf/.docx) — not needed for gsheet" },
    content: { type: "string", description: "Markdown content to export (omit to use manifest)" },
    manifest: { type: "string", description: "Path to _index.yaml (use instead of content)" },
    "project-name": { type: "string", description: "Project name for cover page" },
    feature: { type: "string", description: "Feature folder name (kebab-case)" },
    diff: { type: "boolean", description: "Enable 朱書き diff highlighting (xlsx only)", default: false },
    old: { type: "string", description: "Path to previous version file (required with --diff)" },
    config: { type: "string", description: "Path to sekkei.config.yaml (required for gsheet format)" },
  },
  async run({ args }) {
    const format = args.format as "xlsx" | "pdf" | "docx" | "gsheet";
    const source = args.manifest ? "manifest" : "file";
    const result = await handleExportDocument({
      format,
      doc_type: args["doc-type"] as string,
      output_path: args.output as string | undefined,
      content: args.content as string | undefined,
      manifest_path: args.manifest as string | undefined,
      source,
      project_name: args["project-name"] as string | undefined,
      feature_name: args.feature as string | undefined,
      diff_mode: args.diff as boolean | undefined,
      old_path: args.old as string | undefined,
      config_path: args.config as string | undefined,
    });
    if (result.isError) {
      process.stderr.write(result.content[0].text + "\n");
      process.exit(1);
    }
    process.stdout.write(result.content[0].text + "\n");
  },
});
