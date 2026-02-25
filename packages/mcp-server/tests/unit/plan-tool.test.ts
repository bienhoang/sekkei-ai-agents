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

    it("rejects cancelling a completed plan", async () => {
      const dir = await mkdtemp(join(tmpdir(), "sekkei-cancel-completed-"));
      const cfg = join(dir, "sekkei.config.yaml");
      await writeFile(cfg, CONFIG_YAML, "utf-8");
      try {
        const cr = await call({
          action: "create",
          workspace_path: dir,
          config_path: cfg,
          doc_type: "basic-design",
          features: FEATURES,
        });
        const pid = parseResult(cr).plan_id;
        // Mark all phases completed to auto-complete the plan
        const st = await call({ action: "status", workspace_path: dir, plan_id: pid });
        const phases = parseResult(st).phases;
        for (const phase of phases) {
          await call({
            action: "update",
            workspace_path: dir,
            plan_id: pid,
            phase_number: phase.number,
            phase_status: "completed",
          });
        }
        const result = await call({ action: "cancel", workspace_path: dir, plan_id: pid });
        expect(result.isError).toBe(true);
        expect(result.content[0].text).toContain("Cannot cancel a completed plan");
      } finally {
        await rm(dir, { recursive: true, force: true });
      }
    });

    it("rejects cancel for non-existent plan", async () => {
      const result = await call({
        action: "cancel",
        workspace_path: cancelDir,
        plan_id: "99991231-nonexistent-generation",
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

    it("errors when doc_type is missing", async () => {
      const result = await call({
        action: "detect",
        workspace_path: tmpDir,
        config_path: configPath,
      });
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain("doc_type is required");
    });

    it("errors when config_path is missing", async () => {
      const result = await call({
        action: "detect",
        workspace_path: tmpDir,
        doc_type: "basic-design",
      });
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain("config_path is required");
    });

    it("returns feature_count=0 when functions-list.md is missing", async () => {
      const noDocsDir = await mkdtemp(join(tmpdir(), "sekkei-nodocs-"));
      const cfg = join(noDocsDir, "sekkei.config.yaml");
      await writeFile(cfg, CONFIG_YAML, "utf-8");
      try {
        const result = await call({
          action: "detect",
          workspace_path: noDocsDir,
          config_path: cfg,
          doc_type: "basic-design",
        });
        const data = parseResult(result);
        expect(data.should_trigger).toBe(false);
        expect(data.feature_count).toBe(0);
      } finally {
        await rm(noDocsDir, { recursive: true, force: true });
      }
    });

    it("includes reason string in response", async () => {
      const result = await call({
        action: "detect",
        workspace_path: tmpDir,
        config_path: configPath,
        doc_type: "test-spec",
      });
      const data = parseResult(result);
      expect(data).toHaveProperty("reason");
      expect(typeof data.reason).toBe("string");
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

    it("errors when plan_id is missing", async () => {
      const result = await call({
        action: "execute",
        workspace_path: execDir,
        phase_number: 1,
      });
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain("plan_id is required");
    });

    it("errors when phase_number is missing", async () => {
      const result = await call({
        action: "execute",
        workspace_path: execDir,
        plan_id: planId,
      });
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain("phase_number is required");
    });

    it("errors for non-existent phase number", async () => {
      const result = await call({
        action: "execute",
        workspace_path: execDir,
        plan_id: planId,
        phase_number: 99,
      });
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain("Phase 99 not found");
    });

    it("errors when executing on a completed plan", async () => {
      const dir6 = await mkdtemp(join(tmpdir(), "sekkei-exec-done-"));
      const cfg6 = join(dir6, "sekkei.config.yaml");
      await writeFile(cfg6, CONFIG_YAML, "utf-8");
      try {
        const cr = await call({
          action: "create",
          workspace_path: dir6,
          config_path: cfg6,
          doc_type: "basic-design",
          features: FEATURES,
        });
        const pid = parseResult(cr).plan_id;
        // Complete all phases
        const st = await call({ action: "status", workspace_path: dir6, plan_id: pid });
        for (const phase of parseResult(st).phases) {
          await call({
            action: "update",
            workspace_path: dir6,
            plan_id: pid,
            phase_number: phase.number,
            phase_status: "completed",
          });
        }
        const result = await call({
          action: "execute",
          workspace_path: dir6,
          plan_id: pid,
          phase_number: 1,
        });
        expect(result.isError).toBe(true);
        expect(result.content[0].text).toContain("cannot execute phases");
      } finally {
        await rm(dir6, { recursive: true, force: true });
      }
    });

    it("errors when executing on a cancelled plan", async () => {
      const dir7 = await mkdtemp(join(tmpdir(), "sekkei-exec-cancelled-"));
      const cfg7 = join(dir7, "sekkei.config.yaml");
      await writeFile(cfg7, CONFIG_YAML, "utf-8");
      try {
        const cr = await call({
          action: "create",
          workspace_path: dir7,
          config_path: cfg7,
          doc_type: "basic-design",
          features: FEATURES,
        });
        const pid = parseResult(cr).plan_id;
        await call({ action: "cancel", workspace_path: dir7, plan_id: pid });
        const result = await call({
          action: "execute",
          workspace_path: dir7,
          plan_id: pid,
          phase_number: 1,
        });
        expect(result.isError).toBe(true);
        expect(result.content[0].text).toContain("cannot execute phases");
      } finally {
        await rm(dir7, { recursive: true, force: true });
      }
    });

    it("returns already_done for skipped phase", async () => {
      // Mark phase 2 as skipped (if not already done)
      await call({
        action: "update",
        workspace_path: execDir,
        plan_id: planId,
        phase_number: 2,
        phase_status: "skipped",
      });
      const result = await call({
        action: "execute",
        workspace_path: execDir,
        plan_id: planId,
        phase_number: 2,
      });
      const data = parseResult(result);
      expect(data.already_done).toBe(true);
      expect(data.status).toBe("skipped");
    });

    it("includes survey_data and output_path in execute response", async () => {
      const dir8 = await mkdtemp(join(tmpdir(), "sekkei-exec-survey-"));
      const cfg8 = join(dir8, "sekkei.config.yaml");
      await writeFile(cfg8, CONFIG_YAML, "utf-8");
      try {
        const cr = await call({
          action: "create",
          workspace_path: dir8,
          config_path: cfg8,
          doc_type: "basic-design",
          features: FEATURES,
          survey_data: { keigo: "sonkeigo", industry: "finance" },
        });
        const pid = parseResult(cr).plan_id;
        const result = await call({
          action: "execute",
          workspace_path: dir8,
          plan_id: pid,
          phase_number: 1,
        });
        const data = parseResult(result);
        expect(data.survey_data).toEqual({ keigo: "sonkeigo", industry: "finance" });
        expect(data).toHaveProperty("output_path");
        expect(data).toHaveProperty("total_phases");
        expect(data).toHaveProperty("completed_phases");
      } finally {
        await rm(dir8, { recursive: true, force: true });
      }
    });

    it("includes scope and feature_name in per-feature execute args", async () => {
      const dir9 = await mkdtemp(join(tmpdir(), "sekkei-exec-feature-"));
      const cfg9 = join(dir9, "sekkei.config.yaml");
      await writeFile(cfg9, CONFIG_YAML, "utf-8");
      try {
        const cr = await call({
          action: "create",
          workspace_path: dir9,
          config_path: cfg9,
          doc_type: "basic-design",
          features: FEATURES,
        });
        const pid = parseResult(cr).plan_id;
        // Phase 2 is the first per-feature phase (sal, priority 1)
        const result = await call({
          action: "execute",
          workspace_path: dir9,
          plan_id: pid,
          phase_number: 2,
        });
        const data = parseResult(result);
        expect(data.command.args.scope).toBe("feature");
        expect(data.command.args.feature_name).toBe("sal");
      } finally {
        await rm(dir9, { recursive: true, force: true });
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

    it("errors when plan_id is missing", async () => {
      const result = await call({
        action: "update",
        workspace_path: updateDir,
        phase_number: 1,
        phase_status: "completed",
      });
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain("plan_id is required");
    });

    it("errors when phase_number is missing", async () => {
      const result = await call({
        action: "update",
        workspace_path: updateDir,
        plan_id: updatePlanId,
        phase_status: "completed",
      });
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain("phase_number is required");
    });

    it("errors when phase_status is missing", async () => {
      const result = await call({
        action: "update",
        workspace_path: updateDir,
        plan_id: updatePlanId,
        phase_number: 1,
      });
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain("phase_status is required");
    });

    it("errors for invalid phase number", async () => {
      const result = await call({
        action: "update",
        workspace_path: updateDir,
        plan_id: updatePlanId,
        phase_number: 99,
        phase_status: "completed",
      });
      expect(result.isError).toBe(true);
    });

    it("errors for non-existent plan_id", async () => {
      const result = await call({
        action: "update",
        workspace_path: updateDir,
        plan_id: "99991231-nonexistent-generation",
        phase_number: 1,
        phase_status: "completed",
      });
      expect(result.isError).toBe(true);
    });
  });

  // --- create edge cases ---
  describe("create edge cases", () => {
    it("errors when config_path is missing", async () => {
      const result = await call({
        action: "create",
        workspace_path: tmpDir,
        doc_type: "basic-design",
        features: FEATURES,
      });
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain("config_path is required");
    });

    it("errors when features array is empty", async () => {
      const result = await call({
        action: "create",
        workspace_path: tmpDir,
        config_path: configPath,
        doc_type: "basic-design",
        features: [],
      });
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain("features array is required");
    });

    it("errors when features is undefined", async () => {
      const result = await call({
        action: "create",
        workspace_path: tmpDir,
        config_path: configPath,
        doc_type: "basic-design",
      });
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain("features array is required");
    });

    it("sorts features by priority in phases", async () => {
      const dirPrio = await mkdtemp(join(tmpdir(), "sekkei-prio-"));
      const cfgPrio = join(dirPrio, "sekkei.config.yaml");
      await writeFile(cfgPrio, CONFIG_YAML, "utf-8");
      try {
        // Give features non-sequential priorities
        const features = [
          { id: "c", name: "Third", complexity: "simple" as const, priority: 3 },
          { id: "a", name: "First", complexity: "medium" as const, priority: 1 },
          { id: "b", name: "Second", complexity: "complex" as const, priority: 2 },
        ];
        const result = await call({
          action: "create",
          workspace_path: dirPrio,
          config_path: cfgPrio,
          doc_type: "basic-design",
          features,
        });
        const data = parseResult(result);
        const featurePhases = data.phases.filter((p: { type: string }) => p.type === "per-feature");
        // Should be sorted by priority: First (1), Second (2), Third (3)
        expect(featurePhases[0].name).toBe("First");
        expect(featurePhases[1].name).toBe("Second");
        expect(featurePhases[2].name).toBe("Third");
      } finally {
        await rm(dirPrio, { recursive: true, force: true });
      }
    });

    it("detail-design creates shared phase", async () => {
      const dirDD = await mkdtemp(join(tmpdir(), "sekkei-dd-create-"));
      const cfgDD = join(dirDD, "sekkei.config.yaml");
      await writeFile(cfgDD, CONFIG_YAML, "utf-8");
      try {
        const result = await call({
          action: "create",
          workspace_path: dirDD,
          config_path: cfgDD,
          doc_type: "detail-design",
          features: FEATURES,
        });
        const data = parseResult(result);
        const types = data.phases.map((p: { type: string }) => p.type);
        expect(types).toContain("shared");
        expect(types).toContain("per-feature");
        expect(types).toContain("validation");
      } finally {
        await rm(dirDD, { recursive: true, force: true });
      }
    });
  });

  // --- status edge cases ---
  describe("status edge cases", () => {
    it("errors when plan_id is missing", async () => {
      const result = await call({
        action: "status",
        workspace_path: tmpDir,
      });
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain("plan_id is required");
    });
  });

  // --- list edge cases ---
  describe("list edge cases", () => {
    it("includes phases_completed count in summary", async () => {
      const result = await call({ action: "list", workspace_path: tmpDir });
      const data = parseResult(result);
      expect(data[0]).toHaveProperty("phases_completed");
      expect(typeof data[0].phases_completed).toBe("number");
    });

    it("includes feature_count in summary", async () => {
      const result = await call({ action: "list", workspace_path: tmpDir });
      const data = parseResult(result);
      expect(data[0]).toHaveProperty("feature_count");
    });

    it("includes created date in summary", async () => {
      const result = await call({ action: "list", workspace_path: tmpDir });
      const data = parseResult(result);
      expect(data[0]).toHaveProperty("created");
      expect(data[0].created).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });
  });

  // --- add_feature ---
  describe("add_feature", () => {
    let afDir: string;
    let afPlanId: string;

    beforeAll(async () => {
      afDir = await mkdtemp(join(tmpdir(), "sekkei-addfeat-"));
      const cfg = join(afDir, "sekkei.config.yaml");
      await writeFile(cfg, CONFIG_YAML, "utf-8");
      const result = await call({
        action: "create",
        workspace_path: afDir,
        config_path: cfg,
        doc_type: "basic-design",
        features: FEATURES,
      });
      afPlanId = parseResult(result).plan_id;
    });

    afterAll(async () => {
      await rm(afDir, { recursive: true, force: true });
    });

    it("adds features to pending plan", async () => {
      const result = await call({
        action: "add_feature",
        workspace_path: afDir,
        plan_id: afPlanId,
        new_features: [
          { id: "auth", name: "Authentication", complexity: "complex", priority: 4 },
        ],
      } as PlanArgs);
      expect(result.isError).toBeUndefined();
      const data = parseResult(result);
      expect(data.success).toBe(true);
      expect(data.added_features).toEqual(["auth"]);
      expect(data.total_features).toBe(4);
    });

    it("adds features to in_progress plan", async () => {
      // Move plan to in_progress
      await call({
        action: "execute",
        workspace_path: afDir,
        plan_id: afPlanId,
        phase_number: 1,
      });
      const result = await call({
        action: "add_feature",
        workspace_path: afDir,
        plan_id: afPlanId,
        new_features: [
          { id: "notify", name: "Notifications", complexity: "simple", priority: 5 },
        ],
      } as PlanArgs);
      expect(result.isError).toBeUndefined();
      const data = parseResult(result);
      expect(data.total_features).toBe(5);
    });

    it("rejects adding to completed plan", async () => {
      const dir = await mkdtemp(join(tmpdir(), "sekkei-af-done-"));
      const cfg = join(dir, "sekkei.config.yaml");
      await writeFile(cfg, CONFIG_YAML, "utf-8");
      try {
        const cr = await call({
          action: "create",
          workspace_path: dir,
          config_path: cfg,
          doc_type: "basic-design",
          features: FEATURES,
        });
        const pid = parseResult(cr).plan_id;
        // Complete all phases
        const st = await call({ action: "status", workspace_path: dir, plan_id: pid });
        for (const phase of parseResult(st).phases) {
          await call({
            action: "update",
            workspace_path: dir,
            plan_id: pid,
            phase_number: phase.number,
            phase_status: "completed",
          });
        }
        const result = await call({
          action: "add_feature",
          workspace_path: dir,
          plan_id: pid,
          new_features: [{ id: "x", name: "X", complexity: "simple", priority: 1 }],
        } as PlanArgs);
        expect(result.isError).toBe(true);
        expect(result.content[0].text).toContain("completed");
      } finally {
        await rm(dir, { recursive: true, force: true });
      }
    });

    it("rejects duplicate feature ID", async () => {
      const result = await call({
        action: "add_feature",
        workspace_path: afDir,
        plan_id: afPlanId,
        new_features: [
          { id: "sal", name: "Duplicate Sales", complexity: "simple", priority: 6 },
        ],
      } as PlanArgs);
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain("Duplicate feature IDs");
      expect(result.content[0].text).toContain("sal");
    });

    it("correctly renumbers validation phase", async () => {
      const dir = await mkdtemp(join(tmpdir(), "sekkei-af-renum-"));
      const cfg = join(dir, "sekkei.config.yaml");
      await writeFile(cfg, CONFIG_YAML, "utf-8");
      try {
        const cr = await call({
          action: "create",
          workspace_path: dir,
          config_path: cfg,
          doc_type: "basic-design",
          features: [{ id: "a", name: "A", complexity: "simple", priority: 1 }],
        });
        const pid = parseResult(cr).plan_id;
        // Original: shared(1), a(2), validation(3)
        const result = await call({
          action: "add_feature",
          workspace_path: dir,
          plan_id: pid,
          new_features: [
            { id: "b", name: "B", complexity: "simple", priority: 2 },
            { id: "c", name: "C", complexity: "simple", priority: 3 },
          ],
        } as PlanArgs);
        const data = parseResult(result);
        const valPhase = data.phases.find((p: { type: string }) => p.type === "validation");
        // Should be: shared(1), a(2), b(3), c(4), validation(5)
        expect(valPhase.number).toBe(5);
        expect(data.phases).toHaveLength(5);
      } finally {
        await rm(dir, { recursive: true, force: true });
      }
    });

    it("rejects adding to cancelled plan", async () => {
      const dir = await mkdtemp(join(tmpdir(), "sekkei-af-cancel-"));
      const cfg = join(dir, "sekkei.config.yaml");
      await writeFile(cfg, CONFIG_YAML, "utf-8");
      try {
        const cr = await call({
          action: "create",
          workspace_path: dir,
          config_path: cfg,
          doc_type: "basic-design",
          features: FEATURES,
        });
        const pid = parseResult(cr).plan_id;
        await call({ action: "cancel", workspace_path: dir, plan_id: pid });
        const result = await call({
          action: "add_feature",
          workspace_path: dir,
          plan_id: pid,
          new_features: [{ id: "x", name: "X", complexity: "simple", priority: 1 }],
        } as PlanArgs);
        expect(result.isError).toBe(true);
        expect(result.content[0].text).toContain("cancelled");
      } finally {
        await rm(dir, { recursive: true, force: true });
      }
    });

    it("rejects intra-batch duplicate feature IDs", async () => {
      const dir = await mkdtemp(join(tmpdir(), "sekkei-af-intradupe-"));
      const cfg = join(dir, "sekkei.config.yaml");
      await writeFile(cfg, CONFIG_YAML, "utf-8");
      try {
        const cr = await call({
          action: "create",
          workspace_path: dir,
          config_path: cfg,
          doc_type: "basic-design",
          features: FEATURES,
        });
        const pid = parseResult(cr).plan_id;
        const result = await call({
          action: "add_feature",
          workspace_path: dir,
          plan_id: pid,
          new_features: [
            { id: "dup", name: "First", complexity: "simple", priority: 1 },
            { id: "dup", name: "Second", complexity: "simple", priority: 2 },
          ],
        } as PlanArgs);
        expect(result.isError).toBe(true);
        expect(result.content[0].text).toContain("Duplicate feature ID in batch");
      } finally {
        await rm(dir, { recursive: true, force: true });
      }
    });

    it("errors when plan_id missing", async () => {
      const result = await call({
        action: "add_feature",
        workspace_path: afDir,
        new_features: [{ id: "x", name: "X", complexity: "simple", priority: 1 }],
      } as PlanArgs);
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain("plan_id is required");
    });

    it("errors when new_features missing", async () => {
      const result = await call({
        action: "add_feature",
        workspace_path: afDir,
        plan_id: afPlanId,
      } as PlanArgs);
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain("new_features");
    });
  });

  // --- error handling ---
  describe("error handling", () => {
    it("wraps non-SekkeiError in isError response", async () => {
      // Force an error by using a non-existent workspace
      const result = await call({
        action: "execute",
        workspace_path: "/nonexistent/path",
        plan_id: "fake-plan",
        phase_number: 1,
      });
      expect(result.isError).toBe(true);
    });

    it("handlePlan catches and returns errors for invalid configs", async () => {
      const result = await call({
        action: "create",
        workspace_path: tmpDir,
        config_path: "/nonexistent/config.yaml",
        doc_type: "basic-design",
        features: FEATURES,
      });
      expect(result.isError).toBe(true);
    });
  });
});
