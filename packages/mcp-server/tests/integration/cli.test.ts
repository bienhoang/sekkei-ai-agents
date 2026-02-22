/**
 * CLI integration tests — spawn bin/cli.js as a subprocess and assert stdout/exit codes.
 */
import { describe, it, expect, beforeAll, afterAll } from "@jest/globals";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const execFileAsync = promisify(execFile);
const __dirname = dirname(fileURLToPath(import.meta.url));
const CLI_PATH = resolve(__dirname, "../../bin/cli.js");
const NODE = process.execPath;

async function runCli(args: string[], cwd?: string): Promise<{ stdout: string; stderr: string; code: number }> {
  try {
    const { stdout, stderr } = await execFileAsync(NODE, [CLI_PATH, ...args], { cwd });
    return { stdout, stderr, code: 0 };
  } catch (err: unknown) {
    const e = err as { stdout?: string; stderr?: string; code?: number };
    return { stdout: e.stdout ?? "", stderr: e.stderr ?? "", code: e.code ?? 1 };
  }
}

let tmpDir: string;

beforeAll(async () => {
  tmpDir = await mkdtemp(join(tmpdir(), "sekkei-cli-test-"));
});

afterAll(async () => {
  await rm(tmpDir, { recursive: true, force: true });
});

describe("sekkei --help", () => {
  it("exits 0 and lists all subcommands", async () => {
    const { stdout, code } = await runCli(["--help"]);
    expect(code).toBe(0);
    expect(stdout).toMatch(/generate/);
    expect(stdout).toMatch(/validate/);
    expect(stdout).toMatch(/export/);
    expect(stdout).toMatch(/status/);
    expect(stdout).toMatch(/glossary/);
  });
});

describe("sekkei generate --help", () => {
  it("exits 0 and describes doc-type positional", async () => {
    const { stdout, code } = await runCli(["generate", "--help"]);
    expect(code).toBe(0);
    // citty uppercases positional arg names in usage line
    expect(stdout).toMatch(/DOC-TYPE/i);
  });
});

describe("sekkei status", () => {
  it("returns error when config not found", async () => {
    const { code, stderr } = await runCli(["status", "--config", join(tmpDir, "nonexistent.yaml")]);
    expect(code).toBe(1);
    expect(stderr).toMatch(/CONFIG_ERROR/);
  });

  it("reads config and shows chain table", async () => {
    const configPath = join(tmpDir, "sekkei.config.yaml");
    await writeFile(configPath, [
      "project:",
      "  name: Test Project",
      "chain:",
      "  rfp: rfp.md",
      "  requirements:",
      "    status: pending",
    ].join("\n"), "utf-8");

    const { stdout, code } = await runCli(["status", "--config", configPath]);
    expect(code).toBe(0);
    expect(stdout).toMatch(/Document Chain Status/);
    expect(stdout).toMatch(/Test Project/);
    expect(stdout).toMatch(/rfp/);
  });
});

describe("sekkei validate --help", () => {
  it("exits 0 and describes validate args", async () => {
    const { stdout, code } = await runCli(["validate", "--help"]);
    expect(code).toBe(0);
    expect(stdout).toMatch(/doc-type/);
    expect(stdout).toMatch(/structure/);
  });
});

describe("sekkei validate content", () => {
  it("validates a minimal requirements doc and exits 0", async () => {
    const content = [
      "# 要件定義書",
      "",
      "## REQ-001 ログイン機能",
      "F-001を参照。",
    ].join("\n");

    const { stdout, code } = await runCli([
      "validate",
      "--doc-type", "requirements",
      "--content", content,
    ]);
    expect(code).toBe(0);
    expect(stdout).toMatch(/Validation Result/);
  });
});
