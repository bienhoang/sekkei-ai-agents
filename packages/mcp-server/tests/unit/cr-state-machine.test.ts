import { describe, it, expect, beforeAll, afterAll } from "@jest/globals";
import { mkdtemp, rm, readFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import {
  validateTransition, createCR, readCR, writeCR, transitionCR,
  listCRs, getCRDir, generateCRId, ALLOWED_TRANSITIONS, isValidCRId,
} from "../../src/lib/cr-state-machine.js";
import type { CRStatus, ChangeRequest } from "../../src/types/change-request.js";

describe("CR state machine", () => {
  let tmpDir: string;

  beforeAll(async () => {
    tmpDir = await mkdtemp(join(tmpdir(), "sekkei-cr-test-"));
  });
  afterAll(async () => {
    await rm(tmpDir, { recursive: true, force: true });
  });

  // --- Transition Validation ---
  describe("validateTransition", () => {
    it("allows valid forward transitions", () => {
      expect(validateTransition("INITIATED", "ANALYZING")).toBe(true);
      expect(validateTransition("ANALYZING", "IMPACT_ANALYZED")).toBe(true);
      expect(validateTransition("IMPACT_ANALYZED", "APPROVED")).toBe(true);
      expect(validateTransition("APPROVED", "PROPAGATING")).toBe(true);
      expect(validateTransition("PROPAGATING", "VALIDATED")).toBe(true);
      expect(validateTransition("VALIDATED", "COMPLETED")).toBe(true);
    });

    it("allows CANCELLED from any non-terminal state", () => {
      const cancellable: CRStatus[] = [
        "INITIATED", "ANALYZING", "IMPACT_ANALYZED",
        "APPROVED", "PROPAGATING", "VALIDATED",
      ];
      for (const s of cancellable) {
        expect(validateTransition(s, "CANCELLED")).toBe(true);
      }
    });

    it("rejects invalid transitions", () => {
      expect(validateTransition("INITIATED", "APPROVED")).toBe(false);
      expect(validateTransition("ANALYZING", "PROPAGATING")).toBe(false);
      expect(validateTransition("COMPLETED", "CANCELLED")).toBe(false);
      expect(validateTransition("CANCELLED", "INITIATED")).toBe(false);
    });
  });

  // --- ID Generation ---
  describe("generateCRId", () => {
    it("generates first ID for today: CR-YYMMDD-001", async () => {
      const crDir = getCRDir(tmpDir);
      const id = await generateCRId(crDir);
      expect(id).toMatch(/^CR-\d{6}-001$/);
    });

    it("increments when existing CRs exist", async () => {
      // Create first CR to establish directory
      await createCR(tmpDir, "requirements", "test", ["REQ-001"]);
      const crDir = getCRDir(tmpDir);
      const id = await generateCRId(crDir);
      expect(id).toMatch(/^CR-\d{6}-002$/);
    });
  });

  // --- CRUD ---
  describe("createCR", () => {
    it("creates CR file with correct YAML frontmatter", async () => {
      const cr = await createCR(tmpDir, "basic-design", "Added screen", ["SCR-005"]);
      expect(cr.id).toMatch(/^CR-\d{6}-\d{3}$/);
      expect(cr.status).toBe("INITIATED");
      expect(cr.origin_doc).toBe("basic-design");
      expect(cr.changed_ids).toEqual(["SCR-005"]);
      expect(cr.history).toHaveLength(1);
      expect(cr.history[0].status).toBe("INITIATED");
    });
  });

  describe("readCR / writeCR", () => {
    it("round-trips: write then read returns identical data", async () => {
      const cr = await createCR(tmpDir, "requirements", "Round trip test", ["REQ-010"]);
      const filePath = join(getCRDir(tmpDir), `${cr.id}.md`);

      // Modify and write
      cr.impact_summary = "3 affected sections";
      cr.propagation_steps = [
        { doc_type: "basic-design", direction: "downstream", status: "pending" },
      ];
      cr.conflict_warnings = ["overlap with CR-260224-001"];
      await writeCR(filePath, cr);

      // Read back
      const read = await readCR(filePath);
      expect(read.id).toBe(cr.id);
      expect(read.impact_summary).toBe("3 affected sections");
      expect(read.propagation_steps).toHaveLength(1);
      expect(read.propagation_steps[0].doc_type).toBe("basic-design");
      expect(read.conflict_warnings).toEqual(["overlap with CR-260224-001"]);
    });

    it("handles special chars in description", async () => {
      const cr = await createCR(tmpDir, "requirements", "Added: 'payment' & \"billing\" module", ["REQ-020"]);
      const filePath = join(getCRDir(tmpDir), `${cr.id}.md`);
      const read = await readCR(filePath);
      expect(read.description).toBe("Added: 'payment' & \"billing\" module");
    });
  });

  describe("transitionCR", () => {
    it("transitions and appends to history", async () => {
      const cr = await createCR(tmpDir, "requirements", "Transition test", ["REQ-030"]);
      const filePath = join(getCRDir(tmpDir), `${cr.id}.md`);

      const updated = await transitionCR(filePath, "ANALYZING", "Starting analysis");
      expect(updated.status).toBe("ANALYZING");
      expect(updated.history).toHaveLength(2);
      expect(updated.history[1].reason).toBe("Starting analysis");
    });

    it("rejects invalid transitions", async () => {
      const cr = await createCR(tmpDir, "requirements", "Invalid test", ["REQ-040"]);
      const filePath = join(getCRDir(tmpDir), `${cr.id}.md`);

      await expect(transitionCR(filePath, "APPROVED")).rejects.toThrow("Invalid transition");
    });
  });

  describe("listCRs", () => {
    it("returns all CRs in directory", async () => {
      const crs = await listCRs(tmpDir);
      expect(crs.length).toBeGreaterThan(0);
      expect(crs[0].id).toMatch(/^CR-/);
    });

    it("returns empty for nonexistent directory", async () => {
      const emptyDir = join(tmpDir, "empty-project");
      const crs = await listCRs(emptyDir);
      expect(crs).toEqual([]);
    });
  });

  describe("isValidCRId", () => {
    it("accepts valid CR IDs", () => {
      expect(isValidCRId("CR-260224-001")).toBe(true);
      expect(isValidCRId("CR-251231-999")).toBe(true);
    });
    it("rejects invalid CR IDs", () => {
      expect(isValidCRId("CR-260224")).toBe(false);
      expect(isValidCRId("REQ-001")).toBe(false);
      expect(isValidCRId("")).toBe(false);
    });
  });
});
