import { describe, it, expect } from "@jest/globals";
import { computePropagationOrder } from "../../src/lib/cr-propagation.js";

describe("computePropagationOrder", () => {
  it("requirements: no upstream, full downstream chain", () => {
    const steps = computePropagationOrder("requirements");
    const upstream = steps.filter(s => s.direction === "upstream");
    const downstream = steps.filter(s => s.direction === "downstream");

    expect(upstream).toHaveLength(0);
    expect(downstream.length).toBeGreaterThan(0);

    const downDocs = downstream.map(s => s.doc_type);
    expect(downDocs).toContain("functions-list");
    expect(downDocs).toContain("basic-design");
    expect(downDocs).toContain("nfr");
    expect(downDocs).toContain("uat-spec");
  });

  it("basic-design: upstream includes requirements, downstream includes detail-design", () => {
    const steps = computePropagationOrder("basic-design");
    const upstream = steps.filter(s => s.direction === "upstream");
    const downstream = steps.filter(s => s.direction === "downstream");

    expect(upstream.map(s => s.doc_type)).toContain("requirements");
    expect(downstream.map(s => s.doc_type)).toContain("detail-design");
    expect(downstream.map(s => s.doc_type)).toContain("security-design");
    expect(downstream.map(s => s.doc_type)).toContain("it-spec");
    expect(downstream.map(s => s.doc_type)).toContain("st-spec");
    expect(downstream.map(s => s.doc_type)).toContain("migration-design");
  });

  it("detail-design: upstream includes basic-design, downstream includes ut-spec", () => {
    const steps = computePropagationOrder("detail-design");
    const upstream = steps.filter(s => s.direction === "upstream");
    const downstream = steps.filter(s => s.direction === "downstream");

    expect(upstream.map(s => s.doc_type)).toContain("basic-design");
    expect(upstream.map(s => s.doc_type)).toContain("requirements");
    expect(downstream.map(s => s.doc_type)).toContain("ut-spec");
  });

  it("ut-spec: upstream includes detail-design and basic-design, no downstream", () => {
    const steps = computePropagationOrder("ut-spec");
    const upstream = steps.filter(s => s.direction === "upstream");
    const downstream = steps.filter(s => s.direction === "downstream");

    expect(upstream.map(s => s.doc_type)).toContain("detail-design");
    expect(downstream).toHaveLength(0);
  });

  it("all steps have status=pending", () => {
    const steps = computePropagationOrder("basic-design");
    for (const step of steps) {
      expect(step.status).toBe("pending");
    }
  });

  it("upstream steps have direction=upstream, downstream have direction=downstream", () => {
    const steps = computePropagationOrder("basic-design");
    for (const step of steps) {
      expect(["upstream", "downstream"]).toContain(step.direction);
    }
  });
});
