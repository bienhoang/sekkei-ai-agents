import { describe, it, expect, beforeAll, afterAll } from "@jest/globals";
import { mkdtemp, rm, writeFile, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { stringify as stringifyYaml, parse as parseYaml } from "yaml";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import {
  registerUpdateChainStatusTool,
  handleUpdateChainStatus,
} from "../../src/tools/update-chain-status.js";

const SAMPLE_CONFIG = {
  project: { name: "test-project", language: "ja" },
  chain: {
    requirements: { status: "pending" },
    functions_list: { status: "pending" },
    basic_design: { status: "in-progress", output: "03-system/" },
  },
};

describe("handleUpdateChainStatus", () => {
  let tmpDir: string;
  let configPath: string;

  beforeAll(async () => {
    tmpDir = await mkdtemp(join(tmpdir(), "sekkei-chain-status-"));
  });

  afterAll(async () => {
    await rm(tmpDir, { recursive: true, force: true });
  });

  /** Write fresh config before each test that needs it */
  async function freshConfig(): Promise<string> {
    const path = join(tmpDir, `config-${Date.now()}.yaml`);
    await writeFile(path, stringifyYaml(SAMPLE_CONFIG), "utf-8");
    return path;
  }

  it("updates status for existing chain entry", async () => {
    configPath = await freshConfig();
    const result = await handleUpdateChainStatus({
      config_path: configPath,
      doc_type: "requirements",
      status: "complete",
    });

    expect(result.isError).toBeUndefined();
    expect(result.content[0].text).toContain("requirements");
    expect(result.content[0].text).toContain("complete");

    // Verify file was actually updated
    const updated = parseYaml(await readFile(configPath, "utf-8")) as typeof SAMPLE_CONFIG;
    expect(updated.chain.requirements.status).toBe("complete");
  });

  it("updates status and output for existing chain entry", async () => {
    configPath = await freshConfig();
    const result = await handleUpdateChainStatus({
      config_path: configPath,
      doc_type: "functions_list",
      status: "complete",
      output: "04-functions-list/functions-list.md",
    });

    expect(result.isError).toBeUndefined();
    expect(result.content[0].text).toContain("output=04-functions-list/functions-list.md");

    const updated = parseYaml(await readFile(configPath, "utf-8")) as any;
    expect(updated.chain.functions_list.status).toBe("complete");
    expect(updated.chain.functions_list.output).toBe("04-functions-list/functions-list.md");
  });

  it("returns error for missing config file", async () => {
    const result = await handleUpdateChainStatus({
      config_path: join(tmpDir, "nonexistent.yaml"),
      doc_type: "requirements",
      status: "complete",
    });

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain("CONFIG_ERROR");
    expect(result.content[0].text).toContain("not found");
  });

  it("returns error for missing chain section", async () => {
    const noChainPath = join(tmpDir, "no-chain.yaml");
    await writeFile(noChainPath, stringifyYaml({ project: { name: "test" } }), "utf-8");

    const result = await handleUpdateChainStatus({
      config_path: noChainPath,
      doc_type: "requirements",
      status: "complete",
    });

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain("No chain section");
  });

  it("returns error for unknown doc_type", async () => {
    configPath = await freshConfig();
    const result = await handleUpdateChainStatus({
      config_path: configPath,
      doc_type: "nonexistent_doc",
      status: "complete",
    });

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain("not found in chain");
  });

  it("returns error for oversized config", async () => {
    const largePath = join(tmpDir, "large.yaml");
    await writeFile(largePath, "x".repeat(200_000), "utf-8");

    const result = await handleUpdateChainStatus({
      config_path: largePath,
      doc_type: "requirements",
      status: "complete",
    });

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain("too large");
  });
});

describe("registerUpdateChainStatusTool", () => {
  it("registers tool on server", () => {
    const server = new McpServer({ name: "test", version: "0.0.1" });
    registerUpdateChainStatusTool(server);
    expect((server as any)._registeredTools["update_chain_status"]).toBeDefined();
  });
});
