import { describe, it, expect, beforeAll, afterAll } from "@jest/globals";
import { writeFile, mkdir, rm } from "node:fs/promises";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerChainStatusTool } from "../../src/tools/chain-status.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const TMP_DIR = resolve(__dirname, "../tmp");

async function callTool(
  server: McpServer,
  name: string,
  args: Record<string, unknown>
): Promise<{ content: Array<{ type: string; text: string }>; isError?: boolean }> {
  return (server as any)._registeredTools[name].handler(args, {});
}

describe("get_chain_status tool", () => {
  let server: McpServer;
  const configPath = resolve(TMP_DIR, "sekkei.config.yaml");

  beforeAll(async () => {
    server = new McpServer({ name: "test", version: "0.0.1" });
    registerChainStatusTool(server);

    await mkdir(TMP_DIR, { recursive: true });

    // Create feature directories (runtime discovery)
    const docsDir = resolve(TMP_DIR, "docs");
    await mkdir(resolve(docsDir, "05-features/sales-management"), { recursive: true });
    await writeFile(resolve(docsDir, "05-features/sales-management/basic-design.md"), "# BD\n", "utf-8");

    await writeFile(
      configPath,
      [
        "project:",
        "  name: Test Project",
        "output:",
        "  directory: ./docs/",
        "chain:",
        "  rfp: ./input/rfp.md",
        "  functions_list:",
        "    status: complete",
        "    output: 04-functions-list/functions-list.md",
        "  requirements:",
        "    status: in-progress",
        "  nfr:",
        "    status: pending",
        "  basic_design:",
        "    status: pending",
        "    system_output: 03-system/",
        "    features_output: 05-features/",
        "  detail_design:",
        "    status: pending",
        "  test_plan:",
        "    status: pending",
        "  ut_spec:",
        "    status: pending",
        "  it_spec:",
        "    status: pending",
        "  glossary:",
        "    status: pending",
        "    output: 10-glossary.md",
      ].join("\n")
    );
  });

  afterAll(async () => {
    await rm(TMP_DIR, { recursive: true, force: true });
  });

  it("registers on the server", () => {
    expect((server as any)._registeredTools["get_chain_status"]).toBeDefined();
  });

  it("returns chain status from config", async () => {
    const result = await callTool(server, "get_chain_status", {
      config_path: configPath,
    });

    const text = result.content[0].text;
    expect(text).toContain("Test Project");
    expect(text).toContain("requirements");
    expect(text).toContain("functions-list");
    expect(text).toContain("complete");
    expect(text).toContain("in-progress");
    expect(text).toContain("pending");
    expect(text).toContain("system: 03-system/");
  });

  it("discovers features from filesystem and shows status", async () => {
    const result = await callTool(server, "get_chain_status", {
      config_path: configPath,
    });

    const text = result.content[0].text;
    expect(text).toContain("Feature Status");
    expect(text).toContain("sales-management");
    // basic-design.md exists → ✅, others don't → ⏳
    expect(text).toMatch(/sales-management.*✅.*⏳.*⏳.*⏳/);
  });

  it("returns error for missing config", async () => {
    const result = await callTool(server, "get_chain_status", {
      config_path: "/nonexistent/config.yaml",
    });

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain("CONFIG_ERROR");
  });
});
