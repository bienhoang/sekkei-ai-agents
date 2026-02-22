/**
 * CLI glossary command — wraps handleGlossary tool handler.
 */
import { defineCommand } from "citty";
import { handleGlossary } from "../../tools/glossary.js";

export const glossaryCommand = defineCommand({
  meta: { name: "glossary", description: "Manage project terminology glossary" },
  args: {
    action: { type: "positional", required: true, description: "Action: add, list, find, export, import" },
    "project-path": { type: "string", required: true, description: "Path to glossary.yaml" },
    ja: { type: "string", description: "Japanese term (for add action)" },
    en: { type: "string", description: "English term (for add action)" },
    vi: { type: "string", description: "Vietnamese term (for add action)" },
    context: { type: "string", description: "Term context/description" },
    query: { type: "string", description: "Search query (for find action)" },
    industry: { type: "string", description: "Industry glossary to import (for import action)" },
  },
  async run({ args }) {
    const action = args.action as "add" | "list" | "find" | "export" | "import";
    const result = await handleGlossary({
      action,
      project_path: args["project-path"] as string,
      ja: args.ja as string | undefined,
      en: args.en as string | undefined,
      vi: args.vi as string | undefined,
      context: args.context as string | undefined,
      query: args.query as string | undefined,
      industry: args.industry as string | undefined,
    });
    if (result.isError) {
      process.stderr.write(result.content[0].text + "\n");
      process.exit(1);
    }
    process.stdout.write(result.content[0].text + "\n");
  },
});
