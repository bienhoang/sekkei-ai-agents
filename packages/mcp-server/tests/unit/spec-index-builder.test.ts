import { describe, it, expect, beforeEach, afterAll } from "@jest/globals";
import { writeFile, mkdir, rm, readFile } from "node:fs/promises";
import { resolve, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { buildSpecIndexData, writeAgentArtifacts, reconcileAgentIndex } from "../../src/lib/spec-index-builder.js";
import { renderSpecIndex, computeNextFreeIds } from "../../src/lib/spec-index-render.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const TMP_DIR = resolve(__dirname, "../tmp/spec-index");

async function scaffold(opts: { utStatus?: string; withBasic?: boolean } = {}): Promise<string> {
  const { utStatus = "complete", withBasic = true } = opts;
  await mkdir(join(TMP_DIR, "02-requirements"), { recursive: true });
  await mkdir(join(TMP_DIR, "04-functions-list"), { recursive: true });
  await mkdir(join(TMP_DIR, "03-system"), { recursive: true });
  await mkdir(join(TMP_DIR, "08-test"), { recursive: true });

  const cfg = [
    "project: { name: SI Test }",
    "chain:",
    "  requirements: { status: complete, output: '02-requirements/requirements.md' }",
    "  functions_list: { status: complete, output: '04-functions-list/functions-list.md' }",
    withBasic ? "  basic_design: { status: complete, output: '03-system/basic-design.md' }" : "",
    `  ut_spec: { status: ${utStatus}, output: '08-test/ut-spec.md' }`,
    "",
  ].filter(Boolean).join("\n");
  await writeFile(join(TMP_DIR, "sekkei.config.yaml"), cfg, "utf-8");

  await writeFile(
    join(TMP_DIR, "02-requirements/requirements.md"),
    "# 要件定義書\n\n| REQ-001 | 登録 |\n| REQ-002 | 一覧 |\n",
    "utf-8",
  );
  await writeFile(
    join(TMP_DIR, "04-functions-list/functions-list.md"),
    "# 機能一覧\n\n| F-001 | 登録 | REQ-001 |\n",
    "utf-8",
  );
  if (withBasic) {
    await writeFile(
      join(TMP_DIR, "03-system/basic-design.md"),
      "# 基本設計書\n\n| SCR-001 | 一覧画面 | F-001 |\n| SCR-SAL-001 | 販売画面 |\n| API-001 | GET /x | F-001 |\n",
      "utf-8",
    );
  }
  await writeFile(
    join(TMP_DIR, "08-test/ut-spec.md"),
    "# 単体テスト仕様書\n\n| UT-001 | 登録テスト | F-001 |\n",
    "utf-8",
  );
  return join(TMP_DIR, "sekkei.config.yaml");
}

describe("spec-index-builder", () => {
  beforeEach(async () => {
    await rm(TMP_DIR, { recursive: true, force: true });
    await mkdir(TMP_DIR, { recursive: true });
  });
  afterAll(async () => {
    await rm(TMP_DIR, { recursive: true, force: true });
  });

  it("populates Source/Status/Title/Traced columns from config + graph", async () => {
    const cfg = await scaffold();
    const data = await buildSpecIndexData(cfg);
    const byId = new Map(data.entries.map((e) => [e.id, e]));

    const f1 = byId.get("F-001")!;
    expect(f1.type).toBe("functions-list");
    expect(f1.source).toBe("04-functions-list/functions-list.md"); // relpath from config
    expect(f1.status).toBe("complete"); // doc-level inherited
    expect(f1.titleJa).toBe("機能一覧");
    expect(f1.traced).toBe(true); // F-001 referenced downstream (basic-design + ut-spec)

    // REQ-001 is referenced downstream (functions-list) → traced; REQ-002 is not.
    expect(byId.get("REQ-001")!.traced).toBe(true);
    expect(byId.get("REQ-002")!.traced).toBe(false);

    // Source resolves to the owning file for basic-design IDs.
    expect(byId.get("API-001")!.source).toBe("03-system/basic-design.md");
  });

  it("computes advisory next-free-ID with base and feature-scoped as SEPARATE spaces", async () => {
    // Pure-function check of the numbering-space separation (the core rule).
    const nf = computeNextFreeIds(["REQ-001", "REQ-002", "F-001", "API-001", "SCR-001", "SCR-002", "SCR-SAL-001"]);
    expect(nf["REQ"]).toBe("REQ-003");
    expect(nf["F"]).toBe("F-002");
    expect(nf["API"]).toBe("API-002");
    expect(nf["SCR"]).toBe("SCR-003");         // base SCR space
    expect(nf["SCR-SAL"]).toBe("SCR-SAL-002"); // feature-scoped SCR space is SEPARATE
  });

  it("documents origin-gating: feature-scoped IDs go to the non-origin note, still counted for next-free", async () => {
    const cfg = await scaffold();
    const data = await buildSpecIndexData(cfg);
    // SCR-SAL-001 is missed by the origin-gated matrix → surfaced as non-origin (not dropped).
    expect(data.nonOrigin).toContain("SCR-SAL-001");
    // Base SCR-001 IS an origin row.
    expect(data.entries.some((e) => e.id === "SCR-001")).toBe(true);
    // reconcile's next-free (current ∪ non-origin) still proposes the feature-scoped space.
    const r = await reconcileAgentIndex(cfg);
    expect(r.nextFree["SCR-SAL"]).toBe("SCR-SAL-002");
  });

  it("reconcile detects added/removed IDs vs the prior spec-index", async () => {
    const cfg = await scaffold();
    await writeAgentArtifacts(cfg); // establish prior spec-index.md

    // Add API-002, remove SCR-001/SCR-SAL-001 by rewriting basic-design.
    await writeFile(
      join(TMP_DIR, "03-system/basic-design.md"),
      "# 基本設計書\n\n| API-001 | GET /x | F-001 |\n| API-002 | POST /x | F-001 |\n",
      "utf-8",
    );
    const r = await reconcileAgentIndex(cfg);

    expect(r.added).toContain("API-002");
    expect(r.removed).toEqual(expect.arrayContaining(["SCR-001", "SCR-SAL-001"]));
    expect(r.partial.isPartial).toBe(false);
  });

  it("prepends a PARTIAL banner when a chain doc is pending/absent", async () => {
    const cfg = await scaffold({ utStatus: "pending" });
    const data = await buildSpecIndexData(cfg);
    expect(data.partial.isPartial).toBe(true);
    expect(renderSpecIndex(data)).toContain("⚠ PARTIAL");

    // Also when a configured doc file is missing on disk.
    const cfg2 = await scaffold({ withBasic: false });
    await rm(join(TMP_DIR, "08-test/ut-spec.md"), { force: true });
    const data2 = await buildSpecIndexData(cfg2);
    expect(data2.partial.isPartial).toBe(true);
  });

  it("flags duplicate IDs that originate in more than one doc type", async () => {
    // Clean corpus → no duplicates.
    const clean = await scaffold();
    expect((await buildSpecIndexData(clean)).duplicates).toEqual([]);

    // NFR originates in BOTH requirements and nfr → NFR-001 must be flagged duplicate.
    await rm(TMP_DIR, { recursive: true, force: true });
    await mkdir(join(TMP_DIR, "02-requirements"), { recursive: true });
    const cfg = [
      "project: { name: Dup Test }",
      "chain:",
      "  requirements: { status: complete, output: '02-requirements/requirements.md' }",
      "  nfr: { status: complete, output: '02-requirements/nfr.md' }",
      "",
    ].join("\n");
    await writeFile(join(TMP_DIR, "sekkei.config.yaml"), cfg, "utf-8");
    await writeFile(join(TMP_DIR, "02-requirements/requirements.md"), "# 要件定義書\n\n| NFR-001 | 性能 |\n", "utf-8");
    await writeFile(join(TMP_DIR, "02-requirements/nfr.md"), "# 非機能要件定義書\n\n| NFR-001 | 性能詳細 |\n", "utf-8");

    const data = await buildSpecIndexData(join(TMP_DIR, "sekkei.config.yaml"));
    expect(data.duplicates).toContain("NFR-001");
  });

  it("reconcile is idempotent: no disk change → no spurious added/removed (incl. feature-scoped)", async () => {
    const cfg = await scaffold(); // corpus includes SCR-SAL-001 (a non-origin, feature-scoped ID)
    await writeAgentArtifacts(cfg); // establish prior spec-index.md
    const r = await reconcileAgentIndex(cfg); // nothing changed on disk
    expect(r.added).toEqual([]);
    expect(r.removed).toEqual([]); // SCR-SAL-001 must NOT be reported removed
  });

  it("resolves Source by exact ID token, not substring (SCR-001 vs sibling SCR-0010)", async () => {
    await mkdir(join(TMP_DIR, "05-features/sales"), { recursive: true });
    await mkdir(join(TMP_DIR, "05-features/account"), { recursive: true });
    await writeFile(
      join(TMP_DIR, "sekkei.config.yaml"),
      "project: { name: Collide }\nchain:\n  basic_design: { status: complete, features_output: '05-features' }\n",
      "utf-8",
    );
    await writeFile(join(TMP_DIR, "05-features/sales/basic-design.md"), "# 基本設計書\n\n| SCR-001 | 販売画面 |\n", "utf-8");
    await writeFile(join(TMP_DIR, "05-features/account/basic-design.md"), "# 基本設計書\n\n| SCR-0010 | 勘定画面 |\n", "utf-8");

    const data = await buildSpecIndexData(join(TMP_DIR, "sekkei.config.yaml"));
    const scr001 = data.entries.find((e) => e.id === "SCR-001")!;
    expect(scr001.source).toBe("05-features/sales/basic-design.md"); // NOT the account file
    const scr0010 = data.entries.find((e) => e.id === "SCR-0010")!;
    expect(scr0010.source).toBe("05-features/account/basic-design.md");
  });

  it("writeAgentArtifacts emits both llms.txt and spec-index.md", async () => {
    const cfg = await scaffold();
    const { agentDir } = await writeAgentArtifacts(cfg);
    const idx = await readFile(join(agentDir, "spec-index.md"), "utf-8");
    const llms = await readFile(join(agentDir, "llms.txt"), "utf-8");
    expect(idx).toContain("# Spec Index");
    expect(idx).toContain("| ID | Type | Title (JA) | Source | Status | Traced |");
    expect(llms).toContain("## Docs");
  });
});
