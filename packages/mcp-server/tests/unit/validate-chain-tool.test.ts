import { describe, it, expect, beforeAll, afterAll } from "@jest/globals";
import { writeFile, mkdir, rm } from "node:fs/promises";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerValidateChain } from "../../src/tools/validate-chain.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const TMP_DIR = resolve(__dirname, "../tmp/validate-chain");

async function callTool(
  server: McpServer,
  name: string,
  args: Record<string, unknown>
): Promise<{ content: Array<{ type: string; text: string }>; isError?: boolean }> {
  return (server as any)._registeredTools[name].handler(args, {});
}

describe("validate_chain tool", () => {
  let server: McpServer;

  beforeAll(async () => {
    server = new McpServer({ name: "test", version: "0.0.1" });
    registerValidateChain(server);
    await mkdir(TMP_DIR, { recursive: true });
  });

  afterAll(async () => {
    await rm(TMP_DIR, { recursive: true, force: true });
  });

  it("registers on the server", () => {
    expect((server as any)._registeredTools["validate_chain"]).toBeDefined();
  });

  it("returns error for missing config", async () => {
    const result = await callTool(server, "validate_chain", {
      config_path: resolve(TMP_DIR, "nonexistent.yaml"),
    });

    expect(result.isError).toBe(true);
  });

  it("returns empty report when no docs exist", async () => {
    const configPath = resolve(TMP_DIR, "empty.yaml");
    await writeFile(configPath, [
      "project:",
      "  name: Empty",
      "chain:",
      "  requirements:",
      "    status: pending",
    ].join("\n"), "utf-8");

    const result = await callTool(server, "validate_chain", {
      config_path: configPath,
    });

    expect(result.isError).toBeUndefined();
    const text = result.content[0].text;
    expect(text).toContain("Chain Cross-Reference Report");
    expect(text).toContain("No document pairs found");
  });

  it("analyzes cross-references between existing docs", async () => {
    // loadChainDocs resolves output paths relative to config dir
    await mkdir(resolve(TMP_DIR, "02-requirements"), { recursive: true });
    await mkdir(resolve(TMP_DIR, "03-functions-list"), { recursive: true });

    // Requirements doc defines REQ-001, REQ-002
    await writeFile(
      resolve(TMP_DIR, "02-requirements/requirements.md"),
      "# 要件定義書\n\n## 機能要件\n| 要件ID | 要件名 |\n| REQ-001 | Login |\n| REQ-002 | Register |\n",
      "utf-8"
    );

    // Functions-list references REQ-001 but not REQ-002
    await writeFile(
      resolve(TMP_DIR, "03-functions-list/functions-list.md"),
      "# 機能一覧\n\n| 機能ID | 関連要件ID |\n| F-001 | REQ-001 |\n",
      "utf-8"
    );

    const configPath = resolve(TMP_DIR, "chain.yaml");
    await writeFile(configPath, [
      "project:",
      "  name: Chain Test",
      "chain:",
      "  requirements:",
      "    status: complete",
      "    output: 02-requirements/requirements.md",
      "  functions_list:",
      "    status: complete",
      "    output: 03-functions-list/functions-list.md",
    ].join("\n"), "utf-8");

    const result = await callTool(server, "validate_chain", {
      config_path: configPath,
    });

    expect(result.isError).toBeUndefined();
    const text = result.content[0].text;
    expect(text).toContain("Chain Cross-Reference Report");
    expect(text).toContain("requirements");
    expect(text).toContain("functions-list");
    // REQ-002 defined in requirements but not referenced in functions-list
    expect(text).toContain("REQ-002");
  });

  it("generates traceability matrix", async () => {
    // Reuse the chain config from previous test
    const configPath = resolve(TMP_DIR, "chain.yaml");

    const result = await callTool(server, "validate_chain", {
      config_path: configPath,
    });

    const text = result.content[0].text;
    expect(text).toContain("Traceability Matrix");
    expect(text).toContain("REQ-001");
    expect(text).toContain("Defined In");
  });
});
