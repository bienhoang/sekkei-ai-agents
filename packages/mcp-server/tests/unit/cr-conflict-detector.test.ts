import { describe, it, expect } from "@jest/globals";
import { detectConflicts } from "../../src/lib/cr-conflict-detector.js";
import type { ChangeRequest } from "../../src/types/change-request.js";

function makeCR(overrides: Partial<ChangeRequest>): ChangeRequest {
  return {
    id: "CR-260224-001",
    status: "INITIATED",
    origin_doc: "requirements",
    description: "test",
    changed_ids: [],
    propagation_steps: [],
    propagation_index: 0,
    conflict_warnings: [],
    created: "2026-02-24",
    updated: "2026-02-24",
    history: [],
    ...overrides,
  };
}

describe("detectConflicts", () => {
  it("detects changed_ids overlap between CRs", () => {
    const candidate = makeCR({ id: "CR-260224-002", changed_ids: ["REQ-001", "F-003"] });
    const active = [
      makeCR({ id: "CR-260224-001", status: "APPROVED", changed_ids: ["REQ-001", "REQ-002"] }),
    ];

    const results = detectConflicts(candidate, active);
    expect(results.length).toBeGreaterThan(0);
    const idConflict = results.find(r => r.overlap_type === "changed_ids");
    expect(idConflict).toBeDefined();
    expect(idConflict!.overlapping).toContain("REQ-001");
  });

  it("detects propagation doc_type overlap", () => {
    const candidate = makeCR({
      id: "CR-260224-002",
      propagation_steps: [
        { doc_type: "basic-design", direction: "downstream", status: "pending" },
      ],
    });
    const active = [
      makeCR({
        id: "CR-260224-001",
        status: "PROPAGATING",
        propagation_steps: [
          { doc_type: "basic-design", direction: "downstream", status: "done" },
          { doc_type: "detail-design", direction: "downstream", status: "pending" },
        ],
      }),
    ];

    const results = detectConflicts(candidate, active);
    const docConflict = results.find(r => r.overlap_type === "propagation_docs");
    expect(docConflict).toBeDefined();
    expect(docConflict!.overlapping).toContain("basic-design");
  });

  it("ignores CRs that are not APPROVED/PROPAGATING", () => {
    const candidate = makeCR({ id: "CR-260224-002", changed_ids: ["REQ-001"] });
    const others = [
      makeCR({ id: "CR-260224-001", status: "INITIATED", changed_ids: ["REQ-001"] }),
      makeCR({ id: "CR-260224-003", status: "COMPLETED", changed_ids: ["REQ-001"] }),
      makeCR({ id: "CR-260224-004", status: "CANCELLED", changed_ids: ["REQ-001"] }),
    ];

    const results = detectConflicts(candidate, others);
    expect(results).toHaveLength(0);
  });

  it("returns empty when no conflicts", () => {
    const candidate = makeCR({ id: "CR-260224-002", changed_ids: ["F-010"] });
    const active = [
      makeCR({ id: "CR-260224-001", status: "APPROVED", changed_ids: ["REQ-001"] }),
    ];

    const results = detectConflicts(candidate, active);
    expect(results).toHaveLength(0);
  });
});
