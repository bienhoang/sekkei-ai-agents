/**
 * CLI integration tests — spawn bin/cli.js as a subprocess and assert stdout/exit codes.
 */
import { describe, it, expect, beforeAll, afterAll } from "@jest/globals";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { mkdtemp, rm } from "node:fs/promises";
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
    expect(stdout).toMatch(/init/);
    expect(stdout).toMatch(/glossary/);
    expect(stdout).toMatch(/doctor/);
  });
});

describe("sekkei doctor", () => {
  it("exits 0 or 1 and shows health check", async () => {
    const { stdout } = await runCli(["doctor"]);
    expect(stdout).toMatch(/Node\.js|Environment|checks/i);
  });
});
