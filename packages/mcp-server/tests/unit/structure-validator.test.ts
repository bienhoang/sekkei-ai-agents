import { describe, it, expect, beforeEach, afterAll } from "@jest/globals";
import { mkdtemp, rm, writeFile, mkdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { validateNumberedStructure } from "../../src/lib/structure-validator.js";

let tmpDir: string;

/** Create a valid scaffold for testing */
async function createValidScaffold(dir: string): Promise<void> {
  const files = ["04-functions-list.md", "10-glossary.md"];
  const dirs = ["01-rfp", "02-requirements", "03-system", "05-features", "06-data", "07-operations", "08-test", "09-ui"];

  for (const f of files) {
    await writeFile(join(dir, f), `# ${f}\n`, "utf-8");
  }
  for (const d of dirs) {
    await mkdir(join(dir, d), { recursive: true });
    await writeFile(join(dir, d, "index.md"), `# Index\n`, "utf-8");
  }
}

beforeEach(async () => {
  tmpDir = await mkdtemp(join(tmpdir(), "sekkei-struct-"));
});

afterAll(async () => {
  try { await rm(tmpDir, { recursive: true }); } catch { /* ignore */ }
});

describe("validateNumberedStructure", () => {
  it("accepts valid numbered structure", async () => {
    await createValidScaffold(tmpDir);
    const issues = await validateNumberedStructure(tmpDir);
    const errors = issues.filter(i => i.type === "error");
    expect(errors).toHaveLength(0);
  });

  it("reports missing required files", async () => {
    await createValidScaffold(tmpDir);
    const { rm: rmFile } = await import("node:fs/promises");
    await rmFile(join(tmpDir, "04-functions-list.md"));

    const issues = await validateNumberedStructure(tmpDir);
    expect(issues.some(i => i.message.includes("04-functions-list.md"))).toBe(true);
  });

  it("reports missing required directories", async () => {
    await createValidScaffold(tmpDir);
    const { rm: rmDir } = await import("node:fs/promises");
    await rmDir(join(tmpDir, "03-system"), { recursive: true });

    const issues = await validateNumberedStructure(tmpDir);
    expect(issues.some(i => i.message.includes("03-system/"))).toBe(true);
  });

  it("reports missing index.md in required directory", async () => {
    await createValidScaffold(tmpDir);
    const { rm: rmFile } = await import("node:fs/promises");
    await rmFile(join(tmpDir, "06-data/index.md"));

    const issues = await validateNumberedStructure(tmpDir);
    expect(issues.some(i => i.message.includes("Missing index.md in 06-data/"))).toBe(true);
  });

  it("rejects non-kebab feature folder names", async () => {
    await createValidScaffold(tmpDir);
    await mkdir(join(tmpDir, "05-features/SAL"), { recursive: true });
    await writeFile(join(tmpDir, "05-features/SAL/index.md"), "# SAL\n", "utf-8");

    const issues = await validateNumberedStructure(tmpDir);
    expect(issues.some(i => i.message.includes("not kebab-case") && i.message.includes("SAL"))).toBe(true);
  });

  it("reports missing index.md in feature folder", async () => {
    await createValidScaffold(tmpDir);
    await mkdir(join(tmpDir, "05-features/sales-management"), { recursive: true });
    // No index.md created

    const issues = await validateNumberedStructure(tmpDir);
    expect(issues.some(i => i.message.includes("Missing index.md in 05-features/sales-management/"))).toBe(true);
  });

  it("accepts valid feature folder with index.md", async () => {
    await createValidScaffold(tmpDir);
    await mkdir(join(tmpDir, "05-features/sales-management"), { recursive: true });
    await writeFile(join(tmpDir, "05-features/sales-management/index.md"), "# Sales\n", "utf-8");

    const issues = await validateNumberedStructure(tmpDir);
    const featureErrors = issues.filter(i => i.message.includes("sales-management") && i.type === "error");
    expect(featureErrors).toHaveLength(0);
  });

  it("warns on unnumbered top-level md files", async () => {
    await createValidScaffold(tmpDir);
    await writeFile(join(tmpDir, "notes.md"), "# Notes\n", "utf-8");

    const issues = await validateNumberedStructure(tmpDir);
    expect(issues.some(i => i.type === "warning" && i.message.includes("notes.md"))).toBe(true);
  });

  it("rejects version suffix filenames", async () => {
    await createValidScaffold(tmpDir);
    await writeFile(join(tmpDir, "04-functions-list-v2.md"), "# v2\n", "utf-8");

    const issues = await validateNumberedStructure(tmpDir);
    expect(issues.some(i => i.type === "error" && i.message.includes("Version suffix"))).toBe(true);
  });
});
