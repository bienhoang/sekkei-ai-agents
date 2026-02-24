import { describe, it, expect, beforeAll, afterAll } from "@jest/globals";
import { mkdtemp, rm, mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { handlePlan } from "../../src/tools/plan.js";
import { getPlanDir, generatePlanId, readPlan } from "../../src/lib/plan-state.js";
import type { PlanArgs } from "../../src/tools/plan.js";

// --- Fixtures ---

const FEATURES = [
  { id: "sal", name: "Sales", complexity: "medium" as const, priority: 1 },
  { id: "inv", name: "Inventory", complexity: "simple" as const, priority: 2 },
  { id: "rep", name: "Reports", complexity: "complex" as const, priority: 3 },
];

const CONFIG_YAML = `
split:
  basic-design:
    enabled: true
  detail-design:
    enabled: true
  test-spec:
    enabled: true
`;

// --- Helpers ---

async function call(args: PlanArgs) {
  return handlePlan(args);
}

function parseResult(result: { content: Array<{ type: string; text: string }>; isError?: boolean }) {
  return JSON.parse(result.content[0].text);
}

// --- Tests ---

describe("manage_plan tool", () => {
  let tmpDir: string;
  let configPath: string;
  let functionsListPath: string;

  beforeAll(async () => {
    tmpDir = await mkdtemp(join(tmpdir(), "sekkei-plan-tool-test-"));

    // Write sekkei.config.yaml
    configPath = join(tmpDir, "sekkei.config.yaml");
    await writeFile(configPath, CONFIG_YAML, "utf-8");

    // Write functions-list.md with 3+ ## headers (features)
    const docsDir = join(tmpDir, "workspace-docs");
    await mkdir(docsDir, { recursive: true });
    functionsListPath = join(docsDir, "functions-list.md");
    await writeFile(functionsListPath, [
      "# 機能一覧",
      "",
      "## 販売管理",
      "F-001 Sales",
      "",
      "## 在庫管理",
      "F-002 Inventory",
      "",
      "## レポート",
      "F-003 Reports",
    ].join("\n"), "utf-8");
  });

  afterAll(async () => {
    await rm(tmpDir, { recursive: true, force: true });
  });

  // --- create ---
  describe("create", () => {
    it("creates plan directory with plan.md and phase files", async () => {
      const result = await call({
        action: "create",
        workspace_path: tmpDir,
        config_path: configPath,
        doc_type: "basic-design",
        features: FEATURES,
      });
      expect(result.isError).toBeUndefined();
      const data = parseResult(result);
      expect(data.success).toBe(true);
      expect(data.plan_id).toMatch(/^\d{8}-basic-design-generation$/);
      expect(Array.isArray(data.phases)).toBe(true);
    });

    it("generates correct phases for basic-design (shared + per-feature + validation)", async () => {
      // Use a different tmpDir to avoid active-plan conflict
      const dir2 = await mkdtemp(join(tmpdir(), "sekkei-bd-phases-"));
      const cfg2 = join(dir2, "sekkei.config.yaml");
      await writeFile(cfg2, CONFIG_YAML, "utf-8");
      try {
        const result = await call({
          action: "create",
          workspace_path: dir2,
          config_path: cfg2,
          doc_type: "basic-design",
          features: FEATURES,
        });
        const data = parseResult(result);
        const types = data.phases.map((p: { type: string }) => p.type);
        expect(types).toContain("shared");
        expect(types).toContain("per-feature");
        expect(types).toContain("validation");
      } finally {
        await rm(dir2, { recursive: true, force: true });
      }
    });

    it("generates correct phases for test-spec (no shared, per-feature + validation)", async () => {
      const dir3 = await mkdtemp(join(tmpdir(), "sekkei-ts-phases-"));
      const cfg3 = join(dir3, "sekkei.config.yaml");
      await writeFile(cfg3, CONFIG_YAML, "utf-8");
      try {
        const result = await call({
          action: "create",
          workspace_path: dir3,
          config_path: cfg3,
          doc_type: "test-spec",
          features: FEATURES,
        });
        const data = parseResult(result);
        const types = data.phases.map((p: { type: string }) => p.type);
        expect(types).not.toContain("shared");
        expect(types).toContain("per-feature");
        expect(types).toContain("validation");
      } finally {
        await rm(dir3, { recursive: true, force: true });
      }
    });

    it("rejects unsupported doc_type", async () => {
      const result = await call({
        action: "create",
        workspace_path: tmpDir,
        config_path: configPath,
        doc_type: "requirements",
        features: FEATURES,
      });
      expect(result.isError).toBe(true);
    });

    it("rejects when split config missing for doc_type", async () => {
      const noSplitConfig = join(tmpDir, "no-split.yaml");
      await writeFile(noSplitConfig, "split: {}", "utf-8");
      const result = await call({
        action: "create",
        workspace_path: tmpDir,
        config_path: noSplitConfig,
        doc_type: "detail-design",
        features: FEATURES,
      });
      expect(result.isError).toBe(true);
    });

    it("rejects when active plan already exists", async () => {
      // basic-design plan already created above → should reject
      const result = await call({
        action: "create",
        workspace_path: tmpDir,
        config_path: configPath,
        doc_type: "basic-design",
        features: FEATURES,
      });
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain("Active plan already exists");
    });

    it("persists survey_data in plan frontmatter", async () => {
      const dir4 = await mkdtemp(join(tmpdir(), "sekkei-survey-"));
      const cfg4 = join(dir4, "sekkei.config.yaml");
      await writeFile(cfg4, CONFIG_YAML, "utf-8");
      try {
        const survey = { keigo: "teineigo", industry: "retail" };
        const result = await call({
          action: "create",
          workspace_path: dir4,
          config_path: cfg4,
          doc_type: "basic-design",
          features: FEATURES,
          survey_data: survey,
        });
        const data = parseResult(result);
        const plansDir = getPlanDir(dir4);
        const plan = await readPlan(join(plansDir, data.plan_id, "plan.md"));
        expect(plan.survey).toEqual(survey);
      } finally {
        await rm(dir4, { recursive: true, force: true });
      }
    });
  });

  // --- status ---
  describe("status", () => {
    it("returns full plan JSON for valid plan_id", async () => {
      const planId = generatePlanId("basic-design");
      const result = await call({
        action: "status",
        workspace_path: tmpDir,
        plan_id: planId,
      });
      expect(result.isError).toBeUndefined();
      const data = parseResult(result);
      expect(data.doc_type).toBe("basic-design");
      expect(data.status).toBe("pending");
      expect(Array.isArray(data.phases)).toBe(true);
    });

    it("errors for non-existent plan", async () => {
      const result = await call({
        action: "status",
        workspace_path: tmpDir,
        plan_id: "99991231-nonexistent-generation",
      });
      expect(result.isError).toBe(true);
    });
  });

  // --- list ---
  describe("list", () => {
    it("returns empty array when no plans", async () => {
      const emptyDir = await mkdtemp(join(tmpdir(), "sekkei-nopl-"));
      try {
        const result = await call({ action: "list", workspace_path: emptyDir });
        const data = parseResult(result);
        expect(Array.isArray(data)).toBe(true);
        expect(data).toHaveLength(0);
      } finally {
        await rm(emptyDir, { recursive: true, force: true });
      }
    });

    it("returns summary of all plans", async () => {
      const result = await call({ action: "list", workspace_path: tmpDir });
      const data = parseResult(result);
      expect(Array.isArray(data)).toBe(true);
      expect(data.length).toBeGreaterThan(0);
      expect(data[0]).toHaveProperty("doc_type");
      expect(data[0]).toHaveProperty("status");
    });

    it("returns stored plan_id instead of regenerated id", async () => {
      const result = await call({ action: "list", workspace_path: tmpDir });
      const data = parseResult(result);
      expect(data[0].plan_id).toMatch(/^\d{8}-basic-design-generation$/);
      // Should be the actual stored plan_id, not "unknown"
      expect(data[0].plan_id).not.toBe("unknown");
    });
  });

  // --- cancel ---
  describe("cancel", () => {
    let cancelDir: string;
    let cancelPlanId: string;

    beforeAll(async () => {
      cancelDir = await mkdtemp(join(tmpdir(), "sekkei-cancel-"));
      const ccfg = join(cancelDir, "sekkei.config.yaml");
      await writeFile(ccfg, CONFIG_YAML, "utf-8");
      const result = await call({
        action: "create",
        workspace_path: cancelDir,
        config_path: ccfg,
        doc_type: "basic-design",
        features: FEATURES,
      });
      cancelPlanId = parseResult(result).plan_id;
    });

    afterAll(async () => {
      await rm(cancelDir, { recursive: true, force: true });
    });

    it("cancels a pending plan", async () => {
      const result = await call({
        action: "cancel",
        workspace_path: cancelDir,
        plan_id: cancelPlanId,
      });
      expect(result.isError).toBeUndefined();
      const data = parseResult(result);
      expect(data.status).toBe("cancelled");
    });

    it("rejects cancelling an already-cancelled plan", async () => {
      const result = await call({
        action: "cancel",
        workspace_path: cancelDir,
        plan_id: cancelPlanId,
      });
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain("already cancelled");
    });

    it("rejects cancel without plan_id", async () => {
      const result = await call({
        action: "cancel",
        workspace_path: cancelDir,
      });
      expect(result.isError).toBe(true);
    });
  });

  // --- detect ---
  describe("detect", () => {
    it("returns should_trigger=true when all conditions met", async () => {
      const result = await call({
        action: "detect",
        workspace_path: tmpDir,
        config_path: configPath,
        doc_type: "test-spec",
      });
      const data = parseResult(result);
      expect(data.should_trigger).toBe(true);
      expect(data.feature_count).toBeGreaterThanOrEqual(3);
    });

    it("returns should_trigger=false when split config missing", async () => {
      const noSplitCfg = join(tmpDir, "empty.yaml");
      await writeFile(noSplitCfg, "split: {}", "utf-8");
      const result = await call({
        action: "detect",
        workspace_path: tmpDir,
        config_path: noSplitCfg,
        doc_type: "detail-design",
      });
      const data = parseResult(result);
      expect(data.should_trigger).toBe(false);
    });

    it("returns should_trigger=false when feature_count < 3", async () => {
      const fewFeaturesDir = await mkdtemp(join(tmpdir(), "sekkei-few-"));
      const cfg = join(fewFeaturesDir, "sekkei.config.yaml");
      await writeFile(cfg, CONFIG_YAML, "utf-8");
      const docs = join(fewFeaturesDir, "workspace-docs");
      await mkdir(docs, { recursive: true });
      await writeFile(join(docs, "functions-list.md"), "# FL\n## Feature A\nF-001", "utf-8");
      try {
        const result = await call({
          action: "detect",
          workspace_path: fewFeaturesDir,
          config_path: cfg,
          doc_type: "basic-design",
        });
        const data = parseResult(result);
        expect(data.should_trigger).toBe(false);
        expect(data.feature_count).toBeLessThan(3);
      } finally {
        await rm(fewFeaturesDir, { recursive: true, force: true });
      }
    });

    it("returns should_trigger=false when active plan exists", async () => {
      // basic-design plan exists from create tests
      const result = await call({
        action: "detect",
        workspace_path: tmpDir,
        config_path: configPath,
        doc_type: "basic-design",
      });
      const data = parseResult(result);
      expect(data.should_trigger).toBe(false);
      expect(data.has_active_plan).toBe(true);
    });
  });

  // --- execute ---
  describe("execute", () => {
    let execDir: string;
    let execCfg: string;
    let planId: string;

    beforeAll(async () => {
      execDir = await mkdtemp(join(tmpdir(), "sekkei-exec-"));
      execCfg = join(execDir, "sekkei.config.yaml");
      await writeFile(execCfg, CONFIG_YAML, "utf-8");
      const result = await call({
        action: "create",
        workspace_path: execDir,
        config_path: execCfg,
        doc_type: "basic-design",
        features: FEATURES,
        survey_data: { keigo: "teineigo" },
      });
      planId = parseResult(result).plan_id;
    });

    afterAll(async () => {
      await rm(execDir, { recursive: true, force: true });
    });

    it("returns generate_document args for shared phase", async () => {
      const result = await call({
        action: "execute",
        workspace_path: execDir,
        plan_id: planId,
        phase_number: 1,
      });
      expect(result.isError).toBeUndefined();
      const data = parseResult(result);
      expect(data.command.tool).toBe("generate_document");
      expect(data.phase.type).toBe("shared");
    });

    it("returns generate_document args with upstream for per-feature phase", async () => {
      const result = await call({
        action: "execute",
        workspace_path: execDir,
        plan_id: planId,
        phase_number: 2,
      });
      expect(result.isError).toBeUndefined();
      const data = parseResult(result);
      expect(data.command.tool).toBe("generate_document");
      expect(data.phase.type).toBe("per-feature");
      expect(data.command.args).toHaveProperty("upstream_content");
    });

    it("returns validate_document args for validation phase", async () => {
      // validation is last phase
      const statusResult = await call({ action: "status", workspace_path: execDir, plan_id: planId });
      const planData = parseResult(statusResult);
      const validationPhase = planData.phases.find((p: { type: string }) => p.type === "validation");
      const result = await call({
        action: "execute",
        workspace_path: execDir,
        plan_id: planId,
        phase_number: validationPhase.number,
      });
      expect(result.isError).toBeUndefined();
      const data = parseResult(result);
      expect(data.command.tool).toBe("validate_document");
    });

    it("returns already_done for completed phase", async () => {
      // Mark phase 1 completed
      await call({
        action: "update",
        workspace_path: execDir,
        plan_id: planId,
        phase_number: 1,
        phase_status: "completed",
      });
      const result = await call({
        action: "execute",
        workspace_path: execDir,
        plan_id: planId,
        phase_number: 1,
      });
      const data = parseResult(result);
      expect(data.already_done).toBe(true);
    });

    it("updates plan status to in_progress on first execute", async () => {
      const dir5 = await mkdtemp(join(tmpdir(), "sekkei-inprog-"));
      const cfg5 = join(dir5, "sekkei.config.yaml");
      await writeFile(cfg5, CONFIG_YAML, "utf-8");
      try {
        const cr = await call({
          action: "create",
          workspace_path: dir5,
          config_path: cfg5,
          doc_type: "basic-design",
          features: FEATURES,
        });
        const pid = parseResult(cr).plan_id;
        await call({ action: "execute", workspace_path: dir5, plan_id: pid, phase_number: 1 });
        const st = await call({ action: "status", workspace_path: dir5, plan_id: pid });
        const planData = parseResult(st);
        expect(planData.status).toBe("in_progress");
      } finally {
        await rm(dir5, { recursive: true, force: true });
      }
    });
  });

  // --- update ---
  describe("update", () => {
    let updateDir: string;
    let updatePlanId: string;

    beforeAll(async () => {
      updateDir = await mkdtemp(join(tmpdir(), "sekkei-update-"));
      const ucfg = join(updateDir, "sekkei.config.yaml");
      await writeFile(ucfg, CONFIG_YAML, "utf-8");
      const result = await call({
        action: "create",
        workspace_path: updateDir,
        config_path: ucfg,
        doc_type: "basic-design",
        features: FEATURES,
      });
      updatePlanId = parseResult(result).plan_id;
    });

    afterAll(async () => {
      await rm(updateDir, { recursive: true, force: true });
    });

    it("updates phase status to completed", async () => {
      const result = await call({
        action: "update",
        workspace_path: updateDir,
        plan_id: updatePlanId,
        phase_number: 1,
        phase_status: "completed",
      });
      expect(result.isError).toBeUndefined();
      const data = parseResult(result);
      const phase1 = data.phases.find((p: { number: number }) => p.number === 1);
      expect(phase1.status).toBe("completed");
    });

    it("updates phase status to skipped", async () => {
      const result = await call({
        action: "update",
        workspace_path: updateDir,
        plan_id: updatePlanId,
        phase_number: 2,
        phase_status: "skipped",
      });
      const data = parseResult(result);
      const phase2 = data.phases.find((p: { number: number }) => p.number === 2);
      expect(phase2.status).toBe("skipped");
    });

    it("auto-completes plan when all phases done", async () => {
      // Mark remaining phases as completed/skipped
      const statusResult = await call({ action: "status", workspace_path: updateDir, plan_id: updatePlanId });
      const planData = parseResult(statusResult);
      const pendingPhases = planData.phases.filter(
        (p: { status: string; number: number }) => p.status === "pending" || p.status === "in_progress"
      );
      for (const phase of pendingPhases) {
        await call({
          action: "update",
          workspace_path: updateDir,
          plan_id: updatePlanId,
          phase_number: phase.number,
          phase_status: "completed",
        });
      }
      const finalStatus = await call({ action: "status", workspace_path: updateDir, plan_id: updatePlanId });
      const finalData = parseResult(finalStatus);
      expect(finalData.status).toBe("completed");
    });
  });
});
