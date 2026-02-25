/**
 * MCP tool: render_screen_mockup
 * Renders YAML layout blocks in markdown to PNG mockup images via Playwright.
 */
import { z } from "zod";
import { readFile, writeFile } from "node:fs/promises";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { renderScreenDesign, isPlaywrightAvailable } from "../lib/mockup-renderer.js";
import { SekkeiError } from "../lib/errors.js";
import { logger } from "../lib/logger.js";

const inputSchema = {
  markdown_path: z.string().max(500).optional()
    .refine(p => !p || !p.includes(".."), { message: "no path traversal" })
    .describe("Path to markdown file containing YAML layout blocks"),
  output_dir: z.string().max(500)
    .refine(p => !p.includes(".."), { message: "no path traversal" })
    .describe("Directory to write PNG files (images/ subdir created automatically)"),
  content: z.string().max(500_000).optional()
    .describe("Raw markdown content instead of file path"),
};

type ToolResult = { content: Array<{ type: "text"; text: string }>; isError?: boolean };

/**
 * Replace ```yaml\n...\n``` layout blocks (those containing layout_type:)
 * with <details data-yaml-layout> wrappers.
 * Collapsed by default in all renderers (VS Code, VitePress, GitHub, Tiptap).
 * User can click to expand and see the source YAML.
 */
function wrapYamlLayoutBlocks(markdown: string): string {
  return markdown.replace(/```yaml\n([\s\S]*?)```/g, (_match, inner: string) => {
    if (!inner.includes("layout_type:")) return _match;
    return `<details data-yaml-layout>\n<summary>YAML Layout Source</summary>\n\n\`\`\`yaml\n${inner}\`\`\`\n\n</details>`;
  });
}

export async function handleRenderMockup(args: {
  markdown_path?: string;
  output_dir: string;
  content?: string;
}): Promise<ToolResult> {
  const { markdown_path, output_dir, content } = args;

  if (!content && !markdown_path) {
    return {
      content: [{ type: "text", text: "[MOCKUP_ERROR] Either markdown_path or content is required" }],
      isError: true,
    };
  }

  let markdown: string;
  if (content) {
    markdown = content;
  } else {
    try {
      markdown = await readFile(markdown_path!, "utf-8");
    } catch (err) {
      return {
        content: [{ type: "text", text: `[MOCKUP_ERROR] Failed to read file: ${(err as Error).message}` }],
        isError: true,
      };
    }
  }

  const available = await isPlaywrightAvailable();
  if (!available) {
    logger.warn("Playwright not installed — YAML blocks remain as structured text");
    return {
      content: [{
        type: "text",
        text: JSON.stringify({
          status: "skipped",
          reason: "Playwright not installed. YAML layout blocks remain as human-readable structured text. Install with: npx playwright install chromium",
          rendered_paths: [],
        }),
      }],
    };
  }

  try {
    const paths = await renderScreenDesign(markdown, output_dir);
    const status = paths.length > 0 ? "rendered" : "no_layouts";

    if (status === "rendered") {
      const modified = wrapYamlLayoutBlocks(markdown);
      if (markdown_path) {
        await writeFile(markdown_path, modified, "utf-8");
      }
      const result: Record<string, unknown> = { status, rendered_paths: paths, count: paths.length };
      if (content) result.modified_content = modified;
      return { content: [{ type: "text", text: JSON.stringify(result) }] };
    }

    return {
      content: [{
        type: "text",
        text: JSON.stringify({ status, rendered_paths: paths, count: paths.length }),
      }],
    };
  } catch (err) {
    const msg = err instanceof SekkeiError ? err.toClientMessage() : (err as Error).message;
    logger.error({ err }, "render_screen_mockup failed");
    return { content: [{ type: "text", text: msg }], isError: true };
  }
}

export function registerRenderMockupTool(server: McpServer): void {
  server.tool(
    "render_screen_mockup",
    "Render YAML layout blocks in markdown to PNG mockup images. Requires Playwright with Chromium.",
    inputSchema,
    async (args) => handleRenderMockup(args as { markdown_path?: string; output_dir: string; content?: string }),
  );
}
