/**
 * CLI validate command — wraps handleValidateDocument tool handler.
 */
import { defineCommand } from "citty";
import { handleValidateDocument } from "../../tools/validate.js";

export const validateCommand = defineCommand({
  meta: { name: "validate", description: "Validate a specification document" },
  args: {
    content: { type: "string", description: "Markdown document content to validate" },
    "doc-type": { type: "string", description: "Document type (e.g. requirements, basic-design)" },
    manifest: { type: "string", description: "Path to _index.yaml for split document validation" },
    structure: { type: "string", description: "Path to output directory for structure validation" },
    completeness: { type: "boolean", description: "Run content depth checks", default: false },
  },
  async run({ args }) {
    const result = await handleValidateDocument({
      content: args.content as string | undefined,
      doc_type: args["doc-type"] as string | undefined,
      manifest_path: args.manifest as string | undefined,
      structure_path: args.structure as string | undefined,
      check_completeness: args.completeness as boolean | undefined,
    });
    if (result.isError) {
      process.stderr.write(result.content[0].text + "\n");
      process.exit(1);
    }
    process.stdout.write(result.content[0].text + "\n");
  },
});
