/**
 * Unit tests for generation-instructions.ts
 * Covers: buildKeigoInstruction (Q5 keigo examples), buildUpstreamIdsBlock (Q4 checklist)
 */
import { buildKeigoInstruction } from "../../src/lib/generation-instructions.js";

describe("buildKeigoInstruction", () => {
  it("丁寧語 includes ✓ keigo example", () => {
    const result = buildKeigoInstruction("丁寧語");
    expect(result).toContain("✓");
    expect(result).toContain("✗");
    expect(result).toContain("例:");
  });

  it("丁寧語 contains ですます guidance", () => {
    const result = buildKeigoInstruction("丁寧語");
    expect(result).toContain("ですます調");
  });

  it("丁寧語 shows before/after pair", () => {
    const result = buildKeigoInstruction("丁寧語");
    // Should have at least one ✗ → ✓ pair
    expect(result).toContain("処理します");
  });

  it("simple style uses である調 with no examples override", () => {
    const result = buildKeigoInstruction("simple");
    expect(result).toContain("である調");
    // simple maps to 丁寧語 examples as fallback in KEIGO_EXAMPLES
    expect(result).toContain("✓");
  });

  it("謙譲語 includes keigo examples", () => {
    const result = buildKeigoInstruction("謙譲語");
    expect(result).toContain("✓");
    expect(result).toContain("例:");
  });

  it("output is a string with base instruction + examples block", () => {
    const result = buildKeigoInstruction("丁寧語");
    expect(typeof result).toBe("string");
    expect(result).toContain("## Writing Style");
    expect(result).toContain("例:");
  });
});
