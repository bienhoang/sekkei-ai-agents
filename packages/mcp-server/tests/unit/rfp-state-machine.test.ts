import { describe, it, expect, beforeAll, afterAll } from "@jest/globals";
import { mkdtemp, rm, readFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import {
  validateTransition, createWorkspace, readStatus, writeStatus,
  writeWorkspaceFile, readWorkspaceFile, recoverPhase, getFileInventory,
  ALLOWED_TRANSITIONS, FILE_WRITE_RULES, isBackwardTransition,
  BACKWARD_TRANSITIONS, appendDecision, getPhaseHistory, getPreviousPhase,
  generateConfigFromWorkspace,
} from "../../src/lib/rfp-state-machine.js";
import { RFP_PHASES } from "../../src/types/documents.js";
import type { RfpPhase, RfpStatus } from "../../src/types/documents.js";

describe("rfp-state-machine", () => {
  let tmpDir: string;

  beforeAll(async () => {
    tmpDir = await mkdtemp(join(tmpdir(), "sekkei-rfp-test-"));
  });
  afterAll(async () => {
    await rm(tmpDir, { recursive: true, force: true });
  });

  // --- Phase Transitions ---
  describe("validateTransition", () => {
    it("allows valid transitions", () => {
      expect(validateTransition("RFP_RECEIVED", "ANALYZING")).toBe(true);
      expect(validateTransition("ANALYZING", "QNA_GENERATION")).toBe(true);
      expect(validateTransition("QNA_GENERATION", "WAITING_CLIENT")).toBe(true);
      expect(validateTransition("WAITING_CLIENT", "DRAFTING")).toBe(true);
      expect(validateTransition("WAITING_CLIENT", "CLIENT_ANSWERED")).toBe(true);
      expect(validateTransition("DRAFTING", "PROPOSAL_UPDATE")).toBe(true);
      expect(validateTransition("CLIENT_ANSWERED", "PROPOSAL_UPDATE")).toBe(true);
      expect(validateTransition("PROPOSAL_UPDATE", "SCOPE_FREEZE")).toBe(true);
    });

    it("rejects invalid transitions", () => {
      expect(validateTransition("RFP_RECEIVED", "SCOPE_FREEZE")).toBe(false);
      expect(validateTransition("ANALYZING", "DRAFTING")).toBe(false);
      expect(validateTransition("SCOPE_FREEZE", "RFP_RECEIVED")).toBe(false);
      expect(validateTransition("QNA_GENERATION", "PROPOSAL_UPDATE")).toBe(false);
      expect(validateTransition("DRAFTING", "ANALYZING")).toBe(false);
    });
  });

  // --- Workspace Creation ---
  describe("createWorkspace", () => {
    it("creates workspace with all files", async () => {
      const ws = await createWorkspace(tmpDir, "test-project");
      const inv = await getFileInventory(ws);
      for (const file of ["00_status.md", "01_raw_rfp.md", "02_analysis.md", "03_questions.md", "04_client_answers.md", "05_proposal.md", "06_scope_freeze.md", "07_decisions.md"]) {
        expect(inv.files[file]?.exists).toBe(true);
      }
    });

    it("sets initial phase to RFP_RECEIVED", async () => {
      const ws = join(tmpDir, "workspace-docs", "01-rfp", "test-project");
      const status = await readStatus(ws);
      expect(status.phase).toBe("RFP_RECEIVED");
      expect(status.project).toBe("test-project");
    });

    it("rejects invalid project names", async () => {
      await expect(createWorkspace(tmpDir, "../evil")).rejects.toThrow("Invalid project name");
      await expect(createWorkspace(tmpDir, "UPPER")).rejects.toThrow("Invalid project name");
    });
  });

  // --- Status Read/Write ---
  describe("readStatus / writeStatus", () => {
    it("round-trips status data with new fields", async () => {
      const ws = join(tmpDir, "workspace-docs", "01-rfp", "test-project");
      const status: RfpStatus = {
        project: "test-project",
        phase: "ANALYZING",
        last_update: "2026-02-23",
        next_action: "Generate Q&A",
        blocking_issues: ["missing budget info", "unclear timeline"],
        assumptions: ["team of 3 engineers"],
        qna_round: 2,
        phase_history: [
          { phase: "RFP_RECEIVED", entered: "2026-02-22" },
          { phase: "ANALYZING", entered: "2026-02-23", reason: "Initial analysis" },
        ],
      };
      await writeStatus(ws, status);
      const read = await readStatus(ws);
      expect(read.phase).toBe("ANALYZING");
      expect(read.blocking_issues).toEqual(["missing budget info", "unclear timeline"]);
      expect(read.assumptions).toEqual(["team of 3 engineers"]);
      expect(read.qna_round).toBe(2);
      expect(read.phase_history).toHaveLength(2);
      expect(read.phase_history[1].reason).toBe("Initial analysis");
    });
  });

  // --- File Write Rules ---
  describe("writeWorkspaceFile", () => {
    const ws = () => join(tmpDir, "workspace-docs", "01-rfp", "test-project");

    it("appends to append-only files", async () => {
      await writeWorkspaceFile(ws(), "01_raw_rfp.md", "First content");
      await writeWorkspaceFile(ws(), "01_raw_rfp.md", "Second content");
      const text = await readFile(join(ws(), "01_raw_rfp.md"), "utf-8");
      expect(text).toContain("First content");
      expect(text).toContain("Second content");
    });

    it("overwrites rewrite files", async () => {
      await writeWorkspaceFile(ws(), "02_analysis.md", "Version 1");
      await writeWorkspaceFile(ws(), "02_analysis.md", "Version 2");
      const text = await readFile(join(ws(), "02_analysis.md"), "utf-8");
      expect(text).toBe("Version 2");
      expect(text).not.toContain("Version 1");
    });

    it("merges checklist files", async () => {
      await writeWorkspaceFile(ws(), "06_scope_freeze.md", "workflow_defined: YES\nauth_method_confirmed: NO");
      await writeWorkspaceFile(ws(), "06_scope_freeze.md", "auth_method_confirmed: YES\nexport_format_confirmed: YES");
      const text = await readFile(join(ws(), "06_scope_freeze.md"), "utf-8");
      expect(text).toContain("workflow_defined: YES");
      expect(text).toContain("auth_method_confirmed: YES");
      expect(text).toContain("export_format_confirmed: YES");
    });

    it("rejects unknown files", async () => {
      await expect(writeWorkspaceFile(ws(), "unknown.md", "x")).rejects.toThrow("Unknown workspace file");
    });
  });

  // --- Phase Recovery ---
  describe("recoverPhase", () => {
    let recWs: string;

    beforeAll(async () => {
      recWs = await createWorkspace(tmpDir, "recovery-test");
    });

    it("returns RFP_RECEIVED for empty workspace", async () => {
      expect(await recoverPhase(recWs)).toBe("RFP_RECEIVED");
    });

    it("returns ANALYZING when 02_analysis exists", async () => {
      await writeWorkspaceFile(recWs, "02_analysis.md", "analysis content");
      expect(await recoverPhase(recWs)).toBe("ANALYZING");
    });

    it("returns WAITING_CLIENT when 03_questions exists", async () => {
      await writeWorkspaceFile(recWs, "03_questions.md", "questions content");
      expect(await recoverPhase(recWs)).toBe("WAITING_CLIENT");
    });

    it("returns DRAFTING when 05_proposal exists without 04", async () => {
      await writeWorkspaceFile(recWs, "05_proposal.md", "proposal content");
      expect(await recoverPhase(recWs)).toBe("DRAFTING");
    });

    it("returns PROPOSAL_UPDATE when 05 + 04 exist", async () => {
      await writeWorkspaceFile(recWs, "04_client_answers.md", "answers content");
      expect(await recoverPhase(recWs)).toBe("PROPOSAL_UPDATE");
    });

    it("returns SCOPE_FREEZE when 06 exists", async () => {
      await writeWorkspaceFile(recWs, "06_scope_freeze.md", "freeze content");
      expect(await recoverPhase(recWs)).toBe("SCOPE_FREEZE");
    });
  });

  // --- Backward Transitions ---
  describe("backward transitions", () => {
    it("allows CLIENT_ANSWERED -> ANALYZING", () => {
      expect(validateTransition("CLIENT_ANSWERED", "ANALYZING")).toBe(true);
    });
    it("allows CLIENT_ANSWERED -> QNA_GENERATION", () => {
      expect(validateTransition("CLIENT_ANSWERED", "QNA_GENERATION")).toBe(true);
    });
    it("allows PROPOSAL_UPDATE -> QNA_GENERATION", () => {
      expect(validateTransition("PROPOSAL_UPDATE", "QNA_GENERATION")).toBe(true);
    });
    it("rejects RFP_RECEIVED -> SCOPE_FREEZE", () => {
      expect(validateTransition("RFP_RECEIVED", "SCOPE_FREEZE")).toBe(false);
    });
    it("rejects SCOPE_FREEZE -> ANALYZING (no edges)", () => {
      expect(validateTransition("SCOPE_FREEZE", "ANALYZING")).toBe(false);
    });
    it("identifies backward transitions", () => {
      expect(isBackwardTransition("CLIENT_ANSWERED", "ANALYZING")).toBe(true);
      expect(isBackwardTransition("PROPOSAL_UPDATE", "QNA_GENERATION")).toBe(true);
      expect(isBackwardTransition("RFP_RECEIVED", "ANALYZING")).toBe(false);
    });
  });

  // --- Q&A Round Tracking ---
  describe("qna_round tracking", () => {
    it("initial workspace has qna_round 0", async () => {
      const ws = join(tmpDir, "workspace-docs", "01-rfp", "test-project");
      const status = await readStatus(ws);
      // We set it to 2 in the round-trip test, so re-create for clean test
      await writeStatus(ws, { ...status, qna_round: 0, phase_history: status.phase_history });
      const fresh = await readStatus(ws);
      expect(fresh.qna_round).toBe(0);
    });

    it("persists qna_round across read/write", async () => {
      const ws = join(tmpDir, "workspace-docs", "01-rfp", "test-project");
      const status = await readStatus(ws);
      await writeStatus(ws, { ...status, qna_round: 3 });
      const read = await readStatus(ws);
      expect(read.qna_round).toBe(3);
    });
  });

  // --- Decision Auto-Logging ---
  describe("decision auto-logging", () => {
    it("appends decision entry on transition", async () => {
      const ws = await createWorkspace(tmpDir, "decision-test");
      await appendDecision(ws, "RFP_RECEIVED", "ANALYZING", "Start analysis");
      const content = await readWorkspaceFile(ws, "07_decisions.md");
      expect(content).toContain("RFP_RECEIVED → ANALYZING");
      expect(content).toContain("Start analysis");
    });

    it("includes backward impact label", async () => {
      const ws = join(tmpDir, "workspace-docs", "01-rfp", "decision-test");
      await appendDecision(ws, "CLIENT_ANSWERED", "ANALYZING", "Scope changed");
      const content = await readWorkspaceFile(ws, "07_decisions.md");
      expect(content).toContain("Re-entering earlier phase for revision");
    });
  });

  // --- Status Backward Compatibility ---
  describe("status backward compatibility", () => {
    it("old format (no qna_round) parses with default 0", async () => {
      const ws = await createWorkspace(tmpDir, "compat-test");
      // Write old-format YAML manually (no qna_round, no phase_history)
      const { writeFile } = await import("node:fs/promises");
      const oldYaml = [
        "---", "project: compat-test", "phase: ANALYZING",
        "last_update: 2026-02-23", "next_action: test",
        "blocking_issues:", "assumptions:", "---", "",
      ].join("\n");
      await writeFile(join(ws, "00_status.md"), oldYaml, "utf-8");
      const status = await readStatus(ws);
      expect(status.qna_round).toBe(0);
      expect(status.phase_history).toEqual([]);
    });
  });

  // --- Config Generation ---
  describe("generateConfigFromWorkspace", () => {
    it("generates valid config YAML from workspace", async () => {
      const ws = await createWorkspace(tmpDir, "config-test");
      // Set up analysis + proposal files
      await writeWorkspaceFile(ws, "02_analysis.md", "## 3. Real System Type\nCategorized as: SaaS product");
      await writeWorkspaceFile(ws, "05_proposal.md", [
        "# Proposal", "## Feature Seed", "",
        "| ID | Name | Display | Priority | Complexity |",
        "|---|---|---|---|---|",
        "| USR | user-management | ユーザー管理 | P1 | M |",
        "| RPT | report-engine | レポート機能 | P2 | L |",
        "",
      ].join("\n"));
      // Set phase to SCOPE_FREEZE for generate-config
      const status = await readStatus(ws);
      await writeStatus(ws, { ...status, phase: "SCOPE_FREEZE" });

      const config = await generateConfigFromWorkspace(ws);
      expect(config).toContain('type: "saas"');
      expect(config).toContain("config-test");
      expect(config).toContain("USR");
      expect(config).toContain("user-management");
    });
  });
});
