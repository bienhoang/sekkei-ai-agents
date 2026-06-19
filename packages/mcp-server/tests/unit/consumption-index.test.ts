import { describe, it, expect, beforeEach, afterAll } from "@jest/globals";
import { writeFile, mkdir, rm, readFile, access } from "node:fs/promises";
import { resolve, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  listChainDocs,
  generateLlmsTxt,
  writeConsumptionArtifacts,
  AGENT_DIR_NAME,
} from "../../src/lib/consumption-index.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const TMP_DIR = resolve(__dirname, "../tmp/consumption-index");

const CONFIG = [
  "project:",
  "  name: Test Project",
  "chain:",
  "  requirements: { status: complete, output: '02-requirements/requirements.md' }",
  "  functions_list: { status: complete, output: '04-functions-list/functions-list.md' }",
  "  basic_design: { status: complete, output: '03-system/basic-design.md' }",
  "",
].join("\n");

async function writeProject(dir: string, withBasicDesign = true): Promise<string> {
  await mkdir(join(dir, "02-requirements"), { recursive: true });
  await mkdir(join(dir, "04-functions-list"), { recursive: true });
  await mkdir(join(dir, "03-system"), { recursive: true });
  await writeFile(join(dir, "sekkei.config.yaml"), CONFIG, "utf-8");
  await writeFile(
    join(dir, "02-requirements/requirements.md"),
    "# 要件定義書\n\n- REQ-001: ログイン機能\n",
    "utf-8",
  );
  await writeFile(
    join(dir, "04-functions-list/functions-list.md"),
    "# 機能一覧\n\n| F-001 | ログイン | REQ-001 |\n",
    "utf-8",
  );
  if (withBasicDesign) {
    await writeFile(
      join(dir, "03-system/basic-design.md"),
      "# 基本設計書\n\n- SCR-001 references REQ-001\n",
      "utf-8",
    );
  }
  return join(dir, "sekkei.config.yaml");
}

async function exists(p: string): Promise<boolean> {
  try {
    await access(p);
    return true;
  } catch {
    return false;
  }
}

describe("consumption-index", () => {
  beforeEach(async () => {
    await rm(TMP_DIR, { recursive: true, force: true });
    await mkdir(TMP_DIR, { recursive: true });
  });

  afterAll(async () => {
    await rm(TMP_DIR, { recursive: true, force: true });
  });

  it("lists only docs present on disk, with config relpaths and H1 titles", async () => {
    const configPath = await writeProject(TMP_DIR);
    const refs = await listChainDocs(configPath);

    expect(refs.map((r) => r.docType).sort()).toEqual(
      ["basic-design", "functions-list", "requirements"].sort(),
    );
    const req = refs.find((r) => r.docType === "requirements")!;
    expect(req.title).toBe("要件定義書");
    expect(req.relPath).toBe("02-requirements/requirements.md");
  });

  it("generates llms.txt with the 4-step protocol and per-doc purpose", async () => {
    const configPath = await writeProject(TMP_DIR);
    const txt = await generateLlmsTxt(configPath);

    expect(txt).toContain("# Test Project");
    expect(txt).toContain("## Docs");
    // 4-step protocol folded into the blockquote.
    expect(txt).toMatch(/^> .*\(1\).*\(2\).*\(3\).*\(4\)/m);
    expect(txt).toContain("[要件定義書](02-requirements/requirements.md)");
    expect(txt).toContain("[基本設計書](03-system/basic-design.md)");
  });

  it("writes artifacts to .sekkei-agent/ at project root", async () => {
    const configPath = await writeProject(TMP_DIR);
    const agentDir = await writeConsumptionArtifacts(configPath);

    expect(agentDir).toBe(join(TMP_DIR, AGENT_DIR_NAME));
    expect(await exists(join(agentDir, "llms.txt"))).toBe(true);
    const txt = await readFile(join(agentDir, "llms.txt"), "utf-8");
    expect(txt).toContain("機能一覧");
  });

  it("expands per-feature (dual-mode) docs to one file entry per feature", async () => {
    // Per-feature config: detail-design lives under features_output dirs, one file per feature.
    const cfg = [
      "project:",
      "  name: Feature Project",
      "chain:",
      "  requirements: { status: complete, output: '02-requirements/requirements.md' }",
      "  basic_design:",
      "    status: complete",
      "    system_output: '03-system'",
      "    features_output: '05-features'",
      "  detail_design:",
      "    status: complete",
      "    features_output: '05-features'",
      "",
    ].join("\n");
    await mkdir(join(TMP_DIR, "02-requirements"), { recursive: true });
    await mkdir(join(TMP_DIR, "03-system"), { recursive: true });
    await mkdir(join(TMP_DIR, "05-features/login"), { recursive: true });
    await mkdir(join(TMP_DIR, "05-features/order"), { recursive: true });
    await writeFile(join(TMP_DIR, "sekkei.config.yaml"), cfg, "utf-8");
    await writeFile(join(TMP_DIR, "02-requirements/requirements.md"), "# 要件定義書\n\nREQ-001\n", "utf-8");
    // shared basic-design in 03-system + per-feature basic-design + detail-design
    await writeFile(join(TMP_DIR, "03-system/basic-design.md"), "# 基本設計書\n\nSCR-001\n", "utf-8");
    await writeFile(join(TMP_DIR, "03-system/security-design.md"), "# セキュリティ設計書\n\n", "utf-8");
    await writeFile(join(TMP_DIR, "05-features/login/basic-design.md"), "# 基本設計書\n\nSCR-LOGIN-001\n", "utf-8");
    await writeFile(join(TMP_DIR, "05-features/order/basic-design.md"), "# 基本設計書\n\nSCR-ORDER-001\n", "utf-8");
    await writeFile(join(TMP_DIR, "05-features/login/detail-design.md"), "# 詳細設計書\n\nCLS-LOGIN-001\n", "utf-8");

    const configPath = join(TMP_DIR, "sekkei.config.yaml");
    const refs = await listChainDocs(configPath);
    const bd = refs.filter((r) => r.docType === "basic-design").map((r) => r.relPath).sort();

    // shared + 2 per-feature files, each resolves to a real .md file (not a bare dir)
    expect(bd).toEqual([
      "03-system/basic-design.md",
      "05-features/login/basic-design.md",
      "05-features/order/basic-design.md",
    ]);
    // does NOT pull in the sibling security-design.md from the shared 03-system dir
    expect(refs.some((r) => r.relPath.endsWith("security-design.md") && r.docType === "basic-design")).toBe(false);
    // detail-design (features_output only) resolves to the concrete feature file
    expect(refs.some((r) => r.docType === "detail-design" && r.relPath === "05-features/login/detail-design.md")).toBe(true);

    // titles disambiguated by feature folder when a docType has multiple files
    const txt = await generateLlmsTxt(configPath);
    expect(txt).toContain("(login)");
    expect(txt).toContain("(order)");
    // every link points at a .md file, never a bare directory
    for (const line of txt.split("\n").filter((l) => l.startsWith("- ["))) {
      expect(line).toMatch(/\]\([^)]+\.md\)/);
    }
  });

  it("is idempotent and prunes stale entries on re-run", async () => {
    const configPath = await writeProject(TMP_DIR);
    await writeConsumptionArtifacts(configPath);

    // Remove basic-design, re-run → it must disappear from the index.
    await rm(join(TMP_DIR, "03-system/basic-design.md"), { force: true });
    const agentDir = await writeConsumptionArtifacts(configPath);
    const txt = await readFile(join(agentDir, "llms.txt"), "utf-8");

    expect(txt).toContain("要件定義書");
    expect(txt).not.toContain("基本設計書");
  });
});
