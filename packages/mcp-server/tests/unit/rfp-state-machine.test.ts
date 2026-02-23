import { describe, it, expect, beforeAll, afterAll } from "@jest/globals";
import { mkdtemp, rm, readFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import {
  validateTransition, createWorkspace, readStatus, writeStatus,
  writeWorkspaceFile, readWorkspaceFile, recoverPhase, getFileInventory,
  ALLOWED_TRANSITIONS, FILE_WRITE_RULES,
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
      const ws = join(tmpDir, "sekkei-docs", "01-rfp", "test-project");
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
    it("round-trips status data", async () => {
      const ws = join(tmpDir, "sekkei-docs", "01-rfp", "test-project");
      const status: RfpStatus = {
        project: "test-project",
        phase: "ANALYZING",
        last_update: "2026-02-23",
        next_action: "Generate Q&A",
        blocking_issues: ["missing budget info", "unclear timeline"],
        assumptions: ["team of 3 engineers"],
      };
      await writeStatus(ws, status);
      const read = await readStatus(ws);
      expect(read.phase).toBe("ANALYZING");
      expect(read.blocking_issues).toEqual(["missing budget info", "unclear timeline"]);
      expect(read.assumptions).toEqual(["team of 3 engineers"]);
    });
  });

  // --- File Write Rules ---
  describe("writeWorkspaceFile", () => {
    const ws = () => join(tmpDir, "sekkei-docs", "01-rfp", "test-project");

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
});
