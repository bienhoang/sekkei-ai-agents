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

describe("handleUpdateChainStatus: hyphen-to-underscore normalization", () => {
  let tmpDir: string;

  beforeAll(async () => {
    tmpDir = await mkdtemp(join(tmpdir(), "sekkei-chain-norm-"));
  });

  afterAll(async () => {
    await rm(tmpDir, { recursive: true, force: true });
  });

  it("normalizes hyphens in doc_type to underscores (project-plan -> project_plan)", async () => {
    const config = {
      project: { name: "test" },
      chain: { project_plan: { status: "pending" } },
    };
    const path = join(tmpDir, "norm-test.yaml");
    await writeFile(path, stringifyYaml(config), "utf-8");

    const result = await handleUpdateChainStatus({
      config_path: path,
      doc_type: "project-plan",
      status: "complete",
      output: "02-requirements/project-plan.md",
    });

    expect(result.isError).toBeUndefined();
    expect(result.content[0].text).toContain("project_plan");
    expect(result.content[0].text).toContain("complete");

    const updated = parseYaml(await readFile(path, "utf-8")) as any;
    expect(updated.chain.project_plan.status).toBe("complete");
    expect(updated.chain.project_plan.output).toBe("02-requirements/project-plan.md");
  });

  it("normalizes test-plan to test_plan", async () => {
    const config = {
      project: { name: "test" },
      chain: { test_plan: { status: "pending" } },
    };
    const path = join(tmpDir, "norm-test-plan.yaml");
    await writeFile(path, stringifyYaml(config), "utf-8");

    const result = await handleUpdateChainStatus({
      config_path: path,
      doc_type: "test-plan",
      status: "complete",
      output: "08-test/test-plan.md",
    });

    expect(result.isError).toBeUndefined();
    const updated = parseYaml(await readFile(path, "utf-8")) as any;
    expect(updated.chain.test_plan.status).toBe("complete");
  });

  it("normalizes migration-design to migration_design", async () => {
    const config = {
      project: { name: "test" },
      chain: { migration_design: { status: "pending" } },
    };
    const path = join(tmpDir, "norm-migration.yaml");
    await writeFile(path, stringifyYaml(config), "utf-8");

    const result = await handleUpdateChainStatus({
      config_path: path,
      doc_type: "migration-design",
      status: "complete",
      output: "06-data/migration-design.md",
    });

    expect(result.isError).toBeUndefined();
    const updated = parseYaml(await readFile(path, "utf-8")) as any;
    expect(updated.chain.migration_design.status).toBe("complete");
  });
});

describe("handleUpdateChainStatus: in-progress status", () => {
  let tmpDir: string;

  beforeAll(async () => {
    tmpDir = await mkdtemp(join(tmpdir(), "sekkei-chain-inprog-"));
  });

  afterAll(async () => {
    await rm(tmpDir, { recursive: true, force: true });
  });

  it("sets status to in-progress", async () => {
    const config = {
      project: { name: "test" },
      chain: { requirements: { status: "pending" } },
    };
    const path = join(tmpDir, "inprog.yaml");
    await writeFile(path, stringifyYaml(config), "utf-8");

    const result = await handleUpdateChainStatus({
      config_path: path,
      doc_type: "requirements",
      status: "in-progress",
    });

    expect(result.isError).toBeUndefined();
    const updated = parseYaml(await readFile(path, "utf-8")) as any;
    expect(updated.chain.requirements.status).toBe("in-progress");
  });

  it("transitions from in-progress to complete", async () => {
    const config = {
      project: { name: "test" },
      chain: { basic_design: { status: "in-progress" } },
    };
    const path = join(tmpDir, "transition.yaml");
    await writeFile(path, stringifyYaml(config), "utf-8");

    const result = await handleUpdateChainStatus({
      config_path: path,
      doc_type: "basic_design",
      status: "complete",
    });

    expect(result.isError).toBeUndefined();
    const updated = parseYaml(await readFile(path, "utf-8")) as any;
    expect(updated.chain.basic_design.status).toBe("complete");
  });
});

describe("handleUpdateChainStatus: chain entry without existing fields", () => {
  let tmpDir: string;

  beforeAll(async () => {
    tmpDir = await mkdtemp(join(tmpdir(), "sekkei-chain-null-"));
  });

  afterAll(async () => {
    await rm(tmpDir, { recursive: true, force: true });
  });

  it("handles null chain entry (creates status field)", async () => {
    const config = {
      project: { name: "test" },
      chain: { requirements: null },
    };
    const path = join(tmpDir, "null-entry.yaml");
    await writeFile(path, stringifyYaml(config), "utf-8");

    const result = await handleUpdateChainStatus({
      config_path: path,
      doc_type: "requirements",
      status: "complete",
    });

    expect(result.isError).toBeUndefined();
    const updated = parseYaml(await readFile(path, "utf-8")) as any;
    expect(updated.chain.requirements.status).toBe("complete");
  });
});

describe("handleUpdateChainStatus: preserves other config fields", () => {
  let tmpDir: string;

  beforeAll(async () => {
    tmpDir = await mkdtemp(join(tmpdir(), "sekkei-chain-preserve-"));
  });

  afterAll(async () => {
    await rm(tmpDir, { recursive: true, force: true });
  });

  it("preserves project metadata and other chain entries after update", async () => {
    const config = {
      project: { name: "my-project", language: "ja", type: "web" },
      chain: {
        requirements: { status: "complete", output: "02-requirements/requirements.md" },
        functions_list: { status: "pending" },
        basic_design: { status: "pending" },
      },
      autoCommit: true,
    };
    const path = join(tmpDir, "preserve.yaml");
    await writeFile(path, stringifyYaml(config), "utf-8");

    await handleUpdateChainStatus({
      config_path: path,
      doc_type: "functions_list",
      status: "complete",
      output: "04-functions-list/functions-list.md",
    });

    const updated = parseYaml(await readFile(path, "utf-8")) as any;
    // Updated entry
    expect(updated.chain.functions_list.status).toBe("complete");
    // Preserved entries
    expect(updated.chain.requirements.status).toBe("complete");
    expect(updated.chain.requirements.output).toBe("02-requirements/requirements.md");
    expect(updated.chain.basic_design.status).toBe("pending");
    // Preserved project metadata
    expect(updated.project.name).toBe("my-project");
    expect(updated.project.language).toBe("ja");
    expect(updated.autoCommit).toBe(true);
  });
});

describe("registerUpdateChainStatusTool", () => {
  it("registers tool on server", () => {
    const server = new McpServer({ name: "test", version: "0.0.1" });
    registerUpdateChainStatusTool(server);
    expect((server as any)._registeredTools["update_chain_status"]).toBeDefined();
  });
});
