/**
 * CLI generate command — wraps handleGenerateDocument tool handler.
 */
import { defineCommand } from "citty";
import { handleGenerateDocument } from "../../tools/generate.js";

export const generateCommand = defineCommand({
  meta: { name: "generate", description: "Generate a specification document" },
  args: {
    "doc-type": { type: "positional", required: true, description: "Document type (e.g. requirements, basic-design)" },
    feature: { type: "string", description: "Feature folder name (kebab-case)" },
    input: { type: "string", description: "Input content or path (passed as-is)" },
    language: { type: "string", description: "Output language: ja (default), en, vi" },
    "project-name": { type: "string", description: "Project name for document header" },
    config: { type: "string", description: "Path to sekkei.config.yaml" },
    "source-code": { type: "string", description: "Path to source code for code-aware generation" },
  },
  async run({ args }) {
    const docType = args["doc-type"] as string;
    const result = await handleGenerateDocument({
      doc_type: docType as Parameters<typeof handleGenerateDocument>[0]["doc_type"],
      input_content: args.input ?? "",
      feature_name: args.feature as string | undefined,
      language: (args.language as "ja" | "en" | "vi" | undefined) ?? "ja",
      project_name: args["project-name"] as string | undefined,
      config_path: args.config as string | undefined,
      source_code_path: args["source-code"] as string | undefined,
    });
    if (result.isError) {
      process.stderr.write(result.content[0].text + "\n");
      process.exit(1);
    }
    process.stdout.write(result.content[0].text + "\n");
  },
});
