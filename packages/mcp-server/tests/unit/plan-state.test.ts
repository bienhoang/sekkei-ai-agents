import { describe, it, expect, beforeAll, afterAll } from "@jest/globals";
import { mkdtemp, rm, mkdir, writeFile, readFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import {
  generatePlanId,
  readPlan,
  writePlan,
  readPhase,
  writePhaseFile,
  findActivePlan,
  listPlans,
  updatePhaseStatus,
  assembleUpstream,
  getPlanDir,
} from "../../src/lib/plan-state.js";
import { SekkeiError } from "../../src/lib/errors.js";
import type { GenerationPlan, PlanPhase, PlanFeature } from "../../src/types/plan.js";

// --- Fixtures ---

const FEATURES: PlanFeature[] = [
  { id: "sal", name: "Sales", complexity: "medium", priority: 1 },
  { id: "inv", name: "Inventory", complexity: "simple", priority: 2 },
];

const SHARED_PHASE: PlanPhase = {
  number: 1, name: "Shared Sections", type: "shared", status: "pending",
  file: "phase-01-shared-sections.md",
};

const FEATURE_PHASE: PlanPhase = {
  number: 2, name: "Sales", type: "per-feature", feature_id: "sal", status: "pending",
  file: "phase-02-sal.md",
};

const VALIDATION_PHASE: PlanPhase = {
  number: 3, name: "Validation", type: "validation", status: "pending",
  file: "phase-final-validation.md",
};

const SPLIT_CONFIG = {
  shared: ["system-architecture", "database-design"],
  feature: ["module-design", "class-design"],
};

function makePlan(overrides: Partial<GenerationPlan> = {}): GenerationPlan {
  return {
    title: "basic-design Generation Plan",
    doc_type: "basic-design",
    status: "pending",
    features: FEATURES,
    feature_count: 2,
    split_mode: true,
    created: "2026-02-24",
    updated: "2026-02-24",
    phases: [SHARED_PHASE, FEATURE_PHASE, VALIDATION_PHASE],
    ...overrides,
  };
}

// --- Tests ---

describe("plan-state", () => {
  let tmpDir: string;
  let plansDir: string;

  beforeAll(async () => {
    tmpDir = await mkdtemp(join(tmpdir(), "sekkei-plan-state-test-"));
    plansDir = getPlanDir(tmpDir);
    await mkdir(plansDir, { recursive: true });
  });

  afterAll(async () => {
    await rm(tmpDir, { recursive: true, force: true });
  });

  // --- generatePlanId ---
  describe("generatePlanId", () => {
    it("returns YYYYMMDD-{docType}-generation format", () => {
      const id = generatePlanId("basic-design");
      expect(id).toMatch(/^\d{8}-basic-design-generation$/);
    });

    it("includes today's date", () => {
      const today = new Date();
      const yyyy = today.getFullYear();
      const mm = String(today.getMonth() + 1).padStart(2, "0");
      const dd = String(today.getDate()).padStart(2, "0");
      const prefix = `${yyyy}${mm}${dd}-test-spec`;
      expect(generatePlanId("test-spec").startsWith(prefix)).toBe(true);
    });
  });

  // --- readPlan / writePlan ---
  describe("readPlan / writePlan", () => {
    it("round-trips plan through YAML frontmatter", async () => {
      const planDir = join(plansDir, "roundtrip");
      await mkdir(planDir, { recursive: true });
      const plan = makePlan({ survey: { keigo: "teineigo", industry: "manufacturing" } });
      await writePlan(planDir, plan);
      const read = await readPlan(join(planDir, "plan.md"));
      expect(read.doc_type).toBe("basic-design");
      expect(read.status).toBe("pending");
      expect(read.feature_count).toBe(2);
    });

    it("preserves survey data", async () => {
      const planDir = join(plansDir, "survey-roundtrip");
      await mkdir(planDir, { recursive: true });
      const plan = makePlan({ survey: { keigo: "sonkeigo", notes: "重要" } });
      await writePlan(planDir, plan);
      const read = await readPlan(join(planDir, "plan.md"));
      expect(read.survey).toEqual({ keigo: "sonkeigo", notes: "重要" });
    });

    it("throws SekkeiError with PLAN_ERROR code for missing file", async () => {
      let caught: unknown;
      try {
        await readPlan("/nonexistent/plan.md");
      } catch (e) {
        caught = e;
      }
      expect(caught instanceof SekkeiError).toBe(true);
      expect((caught as SekkeiError).code).toBe("PLAN_ERROR");
    });

    it("throws SekkeiError with PLAN_ERROR code for invalid status", async () => {
      // Use an isolated tmp dir so the invalid file doesn't pollute listPlans scans
      const isolatedDir = await mkdtemp(join(tmpdir(), "sekkei-invalid-plan-"));
      try {
        const content = `---\nstatus: INVALID\ndoc_type: basic-design\nfeature_count: 0\nsplit_mode: true\ncreated: ""\nupdated: ""\nfeatures: []\nphases: []\n---\n# Plan\n`;
        await writeFile(join(isolatedDir, "plan.md"), content, "utf-8");
        let caught: unknown;
        try {
          await readPlan(join(isolatedDir, "plan.md"));
        } catch (e) {
          caught = e;
        }
        expect(caught instanceof SekkeiError).toBe(true);
        expect((caught as SekkeiError).code).toBe("PLAN_ERROR");
      } finally {
        await rm(isolatedDir, { recursive: true, force: true });
      }
    });

    it("throws SekkeiError for file without frontmatter", async () => {
      const isolatedDir = await mkdtemp(join(tmpdir(), "sekkei-nofm-plan-"));
      try {
        await writeFile(join(isolatedDir, "plan.md"), "# No frontmatter\nJust plain text.\n", "utf-8");
        let caught: unknown;
        try {
          await readPlan(join(isolatedDir, "plan.md"));
        } catch (e) {
          caught = e;
        }
        expect(caught instanceof SekkeiError).toBe(true);
        expect((caught as SekkeiError).message).toContain("missing YAML frontmatter");
      } finally {
        await rm(isolatedDir, { recursive: true, force: true });
      }
    });

    it("preserves plan_id through round-trip", async () => {
      const planDir = join(plansDir, "planid-roundtrip");
      await mkdir(planDir, { recursive: true });
      const plan = makePlan({ plan_id: "20260225-basic-design-generation" });
      await writePlan(planDir, plan);
      const read = await readPlan(join(planDir, "plan.md"));
      expect(read.plan_id).toBe("20260225-basic-design-generation");
    });

    it("preserves all phase data through round-trip", async () => {
      const planDir = join(plansDir, "phases-roundtrip");
      await mkdir(planDir, { recursive: true });
      const plan = makePlan();
      await writePlan(planDir, plan);
      const read = await readPlan(join(planDir, "plan.md"));
      expect(read.phases).toHaveLength(3);
      expect(read.phases[0].type).toBe("shared");
      expect(read.phases[1].type).toBe("per-feature");
      expect(read.phases[1].feature_id).toBe("sal");
      expect(read.phases[2].type).toBe("validation");
    });

    it("writePlan generates markdown body with phase table", async () => {
      const planDir = join(plansDir, "body-check");
      await mkdir(planDir, { recursive: true });
      const plan = makePlan();
      await writePlan(planDir, plan);
      const raw = await readFile(join(planDir, "plan.md"), "utf-8");
      // Body should contain table headers and phase rows
      expect(raw).toContain("| # | Phase | Feature | Status | File |");
      expect(raw).toContain("Shared Sections");
      expect(raw).toContain("Sales");
      expect(raw).toContain("Validation");
      // Dependencies section
      expect(raw).toContain("functions-list.md (upstream)");
      expect(raw).toContain("requirements.md (upstream)");
    });

    it("handles null survey data in round-trip", async () => {
      const planDir = join(plansDir, "null-survey");
      await mkdir(planDir, { recursive: true });
      const plan = makePlan({ survey: undefined });
      await writePlan(planDir, plan);
      const read = await readPlan(join(planDir, "plan.md"));
      // survey should be undefined or falsy when not set
      expect(read.survey).toBeFalsy();
    });
  });

  // --- writePhaseFile / readPhase ---
  describe("writePhaseFile / readPhase", () => {
    it("creates phase file with correct YAML frontmatter", async () => {
      const planDir = join(plansDir, "phases-test");
      await mkdir(planDir, { recursive: true });
      await writePhaseFile(planDir, SHARED_PHASE, "basic-design", SPLIT_CONFIG);
      const phase = await readPhase(join(planDir, "phase-01-shared-sections.md"));
      expect(phase.type).toBe("shared");
      expect(phase.status).toBe("pending");
      expect(phase.name).toBe("Shared Sections");
    });

    it("includes feature_id for per-feature phases", async () => {
      const planDir = join(plansDir, "phases-feature-test");
      await mkdir(planDir, { recursive: true });
      await writePhaseFile(planDir, FEATURE_PHASE, "basic-design", SPLIT_CONFIG, FEATURES[0]);
      const raw = await readFile(join(planDir, "phase-02-sal.md"), "utf-8");
      expect(raw).toContain("feature_id: sal");
    });

    it("omits feature_id for shared/validation phases", async () => {
      const planDir = join(plansDir, "phases-shared-nofid");
      await mkdir(planDir, { recursive: true });
      await writePhaseFile(planDir, SHARED_PHASE, "basic-design", SPLIT_CONFIG);
      const raw = await readFile(join(planDir, "phase-01-shared-sections.md"), "utf-8");
      expect(raw).not.toContain("feature_id");
    });

    it("throws SekkeiError for missing phase file", async () => {
      let caught: unknown;
      try {
        await readPhase("/nonexistent/phase-01.md");
      } catch (e) {
        caught = e;
      }
      expect(caught instanceof SekkeiError).toBe(true);
      expect((caught as SekkeiError).code).toBe("PLAN_ERROR");
      expect((caught as SekkeiError).message).toContain("Phase file not found");
    });

    it("throws SekkeiError for phase file without frontmatter", async () => {
      const isolatedDir = await mkdtemp(join(tmpdir(), "sekkei-nofm-"));
      try {
        await writeFile(join(isolatedDir, "bad-phase.md"), "# No frontmatter here\n", "utf-8");
        let caught: unknown;
        try {
          await readPhase(join(isolatedDir, "bad-phase.md"));
        } catch (e) {
          caught = e;
        }
        expect(caught instanceof SekkeiError).toBe(true);
        expect((caught as SekkeiError).message).toContain("missing YAML frontmatter");
      } finally {
        await rm(isolatedDir, { recursive: true, force: true });
      }
    });

    it("reads validation phase file correctly", async () => {
      const planDir = join(plansDir, "phases-validation-test");
      await mkdir(planDir, { recursive: true });
      await writePhaseFile(planDir, VALIDATION_PHASE, "basic-design", SPLIT_CONFIG);
      const phase = await readPhase(join(planDir, "phase-final-validation.md"));
      expect(phase.type).toBe("validation");
      expect(phase.status).toBe("pending");
      expect(phase.name).toBe("Validation");
      expect(phase.feature_id).toBeUndefined();
    });
  });

  // --- findActivePlan ---
  describe("findActivePlan", () => {
    it("returns null when no plans exist", async () => {
      const emptyDir = await mkdtemp(join(tmpdir(), "sekkei-empty-"));
      try {
        const result = await findActivePlan(emptyDir, "basic-design");
        expect(result).toBeNull();
      } finally {
        await rm(emptyDir, { recursive: true, force: true });
      }
    });

    it("returns null when all plans completed", async () => {
      const planDir = join(plansDir, "20260224-basic-design-generation");
      await mkdir(planDir, { recursive: true });
      await writePlan(planDir, makePlan({ status: "completed" }));
      const result = await findActivePlan(tmpDir, "basic-design");
      expect(result).toBeNull();
    });

    it("returns active plan with pending status", async () => {
      const pdir = join(plansDir, "20260224-detail-design-generation");
      await mkdir(pdir, { recursive: true });
      await writePlan(pdir, makePlan({ doc_type: "detail-design", status: "pending" }));
      const result = await findActivePlan(tmpDir, "detail-design");
      expect(result).not.toBeNull();
      expect(result!.status).toBe("pending");
    });

    it("returns active plan with in_progress status", async () => {
      const pdir = join(plansDir, "20260224-test-spec-generation");
      await mkdir(pdir, { recursive: true });
      await writePlan(pdir, makePlan({ doc_type: "test-spec", status: "in_progress" }));
      const result = await findActivePlan(tmpDir, "test-spec");
      expect(result).not.toBeNull();
      expect(result!.status).toBe("in_progress");
    });

    it("filters by doc_type", async () => {
      // test-spec active, basic-design completed from earlier tests
      const result = await findActivePlan(tmpDir, "basic-design");
      expect(result).toBeNull();
    });

    it("returns null for cancelled plans", async () => {
      const isolatedDir = await mkdtemp(join(tmpdir(), "sekkei-cancelled-"));
      const pDir = getPlanDir(isolatedDir);
      const planDir = join(pDir, "20260225-basic-design-generation");
      await mkdir(planDir, { recursive: true });
      await writePlan(planDir, makePlan({ status: "cancelled" }));
      try {
        const result = await findActivePlan(isolatedDir, "basic-design");
        expect(result).toBeNull();
      } finally {
        await rm(isolatedDir, { recursive: true, force: true });
      }
    });
  });

  // --- listPlans ---
  describe("listPlans", () => {
    it("returns empty array when no plans dir", async () => {
      const noPlansDir = await mkdtemp(join(tmpdir(), "sekkei-noplans-"));
      try {
        const plans = await listPlans(noPlansDir);
        expect(plans).toEqual([]);
      } finally {
        await rm(noPlansDir, { recursive: true, force: true });
      }
    });

    it("returns sorted plans", async () => {
      const plans = await listPlans(tmpDir);
      expect(plans.length).toBeGreaterThan(0);
      // sorted by created ascending
      for (let i = 1; i < plans.length; i++) {
        expect(plans[i].created >= plans[i - 1].created).toBe(true);
      }
    });

    it("skips directories without valid plan.md", async () => {
      const isolatedDir = await mkdtemp(join(tmpdir(), "sekkei-skip-bad-"));
      const pDir = getPlanDir(isolatedDir);
      await mkdir(pDir, { recursive: true });
      // Create a valid plan
      const validDir = join(pDir, "20260225-basic-design-generation");
      await mkdir(validDir, { recursive: true });
      await writePlan(validDir, makePlan({ plan_id: "20260225-basic-design-generation" }));
      // Create an invalid entry (dir without plan.md)
      const badDir = join(pDir, "20260225-broken-generation");
      await mkdir(badDir, { recursive: true });
      try {
        const plans = await listPlans(isolatedDir);
        // Should return only the valid plan, not crash
        expect(plans).toHaveLength(1);
        expect(plans[0].plan_id).toBe("20260225-basic-design-generation");
      } finally {
        await rm(isolatedDir, { recursive: true, force: true });
      }
    });
  });

  // --- updatePhaseStatus ---
  describe("updatePhaseStatus", () => {
    it("updates phase status in plan.md", async () => {
      const planDir = join(plansDir, "update-test");
      await mkdir(planDir, { recursive: true });
      const plan = makePlan({
        doc_type: "basic-design",
        phases: [
          { ...SHARED_PHASE },
          { ...FEATURE_PHASE },
          { ...VALIDATION_PHASE },
        ],
      });
      await writePlan(planDir, plan);
      await writePhaseFile(planDir, SHARED_PHASE, "basic-design", SPLIT_CONFIG);
      await updatePhaseStatus(planDir, 1, "completed");
      const updated = await readPlan(join(planDir, "plan.md"));
      expect(updated.phases[0].status).toBe("completed");
    });

    it("auto-completes plan when all phases done", async () => {
      const planDir = join(plansDir, "autocomplete-test");
      await mkdir(planDir, { recursive: true });
      const singlePhase: PlanPhase = { ...VALIDATION_PHASE, number: 1, file: "phase-final-validation.md" };
      const plan = makePlan({ phases: [singlePhase] });
      await writePlan(planDir, plan);
      await writePhaseFile(planDir, singlePhase, "basic-design", SPLIT_CONFIG);
      await updatePhaseStatus(planDir, 1, "completed");
      const updated = await readPlan(join(planDir, "plan.md"));
      expect(updated.status).toBe("completed");
    });

    it("throws SekkeiError for invalid phase number", async () => {
      const planDir = join(plansDir, "invalid-phase-num");
      await mkdir(planDir, { recursive: true });
      await writePlan(planDir, makePlan());
      let caught: unknown;
      try {
        await updatePhaseStatus(planDir, 99, "completed");
      } catch (e) {
        caught = e;
      }
      expect(caught instanceof SekkeiError).toBe(true);
      expect((caught as SekkeiError).message).toContain("Phase 99 not found");
    });

    it("also updates phase file frontmatter status", async () => {
      const planDir = join(plansDir, "phase-file-update-test");
      await mkdir(planDir, { recursive: true });
      const plan = makePlan({
        phases: [{ ...SHARED_PHASE }, { ...FEATURE_PHASE }, { ...VALIDATION_PHASE }],
      });
      await writePlan(planDir, plan);
      await writePhaseFile(planDir, SHARED_PHASE, "basic-design", SPLIT_CONFIG);
      await updatePhaseStatus(planDir, 1, "completed");
      const raw = await readFile(join(planDir, "phase-01-shared-sections.md"), "utf-8");
      expect(raw).toContain("status: completed");
    });

    it("does not auto-complete plan with mix of completed and pending", async () => {
      const planDir = join(plansDir, "mixed-status-test");
      await mkdir(planDir, { recursive: true });
      const plan = makePlan({
        phases: [
          { ...SHARED_PHASE },
          { ...FEATURE_PHASE },
          { ...VALIDATION_PHASE },
        ],
      });
      await writePlan(planDir, plan);
      await writePhaseFile(planDir, SHARED_PHASE, "basic-design", SPLIT_CONFIG);
      await updatePhaseStatus(planDir, 1, "completed");
      const updated = await readPlan(join(planDir, "plan.md"));
      expect(updated.status).not.toBe("completed");
    });

    it("auto-completes with mix of completed and skipped", async () => {
      const planDir = join(plansDir, "skip-complete-test");
      await mkdir(planDir, { recursive: true });
      const p1: PlanPhase = { ...SHARED_PHASE, number: 1 };
      const p2: PlanPhase = { ...FEATURE_PHASE, number: 2 };
      const plan = makePlan({ phases: [p1, p2] });
      await writePlan(planDir, plan);
      await writePhaseFile(planDir, p1, "basic-design", SPLIT_CONFIG);
      await writePhaseFile(planDir, p2, "basic-design", SPLIT_CONFIG, FEATURES[0]);
      await updatePhaseStatus(planDir, 1, "completed");
      await updatePhaseStatus(planDir, 2, "skipped");
      const updated = await readPlan(join(planDir, "plan.md"));
      expect(updated.status).toBe("completed");
    });

    it("updates the updated timestamp", async () => {
      const planDir = join(plansDir, "timestamp-update");
      await mkdir(planDir, { recursive: true });
      const plan = makePlan({ updated: "2025-01-01" });
      await writePlan(planDir, plan);
      await writePhaseFile(planDir, SHARED_PHASE, "basic-design", SPLIT_CONFIG);
      await updatePhaseStatus(planDir, 1, "completed");
      const updated = await readPlan(join(planDir, "plan.md"));
      expect(updated.updated).not.toBe("2025-01-01");
    });
  });

  // --- assembleUpstream ---
  describe("assembleUpstream", () => {
    let upstreamBase: string;

    beforeAll(async () => {
      upstreamBase = await mkdtemp(join(tmpdir(), "sekkei-upstream-"));
      const docsBase = join(upstreamBase, "workspace-docs");
      await mkdir(docsBase, { recursive: true });
      await mkdir(join(docsBase, "shared"), { recursive: true });
      await mkdir(join(docsBase, "features", "sal"), { recursive: true });
      await writeFile(join(docsBase, "requirements.md"), "# Requirements\nREQ-001 Main requirement", "utf-8");
      await writeFile(join(docsBase, "functions-list.md"), "# Functions\nF-001 Sales function", "utf-8");
      await writeFile(join(docsBase, "shared", "system.md"), "# System Architecture", "utf-8");
      await writeFile(join(docsBase, "features", "sal", "basic-design.md"), "# Sales Basic Design", "utf-8");
    });

    afterAll(async () => {
      await rm(upstreamBase, { recursive: true, force: true });
    });

    it("returns requirements + functions-list for shared phase", async () => {
      const result = await assembleUpstream(upstreamBase, "basic-design", "shared");
      expect(result).toContain("Requirements");
      expect(result).toContain("Functions");
    });

    it("includes feature docs for per-feature detail-design", async () => {
      const result = await assembleUpstream(upstreamBase, "detail-design", "per-feature", "sal");
      expect(result).toContain("Sales Basic Design");
    });

    it("handles missing files gracefully", async () => {
      const result = await assembleUpstream(upstreamBase, "detail-design", "per-feature", "nonexistent");
      expect(result).toContain("[FILE NOT FOUND");
    });

    it("returns empty string for validation phase type", async () => {
      const result = await assembleUpstream(upstreamBase, "basic-design", "validation");
      expect(result).toBe("");
    });

    it("includes detail-design + basic-design for test-spec per-feature", async () => {
      // Create detail-design file for sal feature
      const salDir = join(upstreamBase, "workspace-docs", "features", "sal");
      await writeFile(join(salDir, "detail-design.md"), "# Sales Detail Design", "utf-8");
      const result = await assembleUpstream(upstreamBase, "test-spec", "per-feature", "sal");
      expect(result).toContain("Sales Detail Design");
      expect(result).toContain("Sales Basic Design");
    });

    it("per-feature without featureId still includes base upstream", async () => {
      const result = await assembleUpstream(upstreamBase, "basic-design", "per-feature");
      expect(result).toContain("Requirements");
      expect(result).toContain("Functions");
    });
  });

  // --- getPlanDir ---
  describe("getPlanDir", () => {
    it("returns workspace-docs/plans path", () => {
      const dir = getPlanDir("/tmp/project");
      expect(dir).toBe("/tmp/project/workspace-docs/plans");
    });
  });
});
