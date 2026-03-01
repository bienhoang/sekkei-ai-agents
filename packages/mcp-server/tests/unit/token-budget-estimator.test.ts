import { describe, it, expect } from "@jest/globals";
import { estimateOutputTokens, formatAdvisory } from "../../src/lib/token-budget-estimator.js";

describe("token-budget-estimator", () => {
  describe("estimateOutputTokens", () => {
    it("basic-design with 10 screens estimates > 8000 tokens", () => {
      const result = estimateOutputTokens("basic-design", { SCR: 10, TBL: 5, API: 3 });
      // base(3000) + SCR(10*800=8000) + TBL(5*600=3000) + API(3*500=1500) = 15500
      expect(result.estimated_tokens).toBeGreaterThan(8000);
      expect(result.recommended_strategy).toBe("monolithic");
    });

    it("basic-design with 40 screens recommends split_required", () => {
      const result = estimateOutputTokens("basic-design", { SCR: 40 });
      // base(3000) + SCR(40*800=32000) = 35000 > 24000
      expect(result.recommended_strategy).toBe("split_required");
    });

    it("detail-design with 5 APIs recommends monolithic", () => {
      const result = estimateOutputTokens("detail-design", { API: 5 });
      // base(2000) + API(5*1200=6000) = 8000 < 16000
      expect(result.recommended_strategy).toBe("monolithic");
    });

    it("unknown doc type uses default calibration without throwing", () => {
      const result = estimateOutputTokens("unknown-doc", { SCR: 5, API: 3 });
      // default base(2000) + SCR(5*200=1000) + API(3*200=600) = 3600
      expect(result.estimated_tokens).toBe(3600);
      expect(result.recommended_strategy).toBe("monolithic");
    });

    it("zero entities returns base tokens only", () => {
      const result = estimateOutputTokens("basic-design", {});
      expect(result.estimated_tokens).toBe(3000);
      expect(result.recommended_strategy).toBe("monolithic");
    });

    it("progressive threshold: 16K-24K range", () => {
      const result = estimateOutputTokens("basic-design", { SCR: 20 });
      // base(3000) + SCR(20*800=16000) = 19000
      expect(result.estimated_tokens).toBe(19000);
      expect(result.recommended_strategy).toBe("progressive");
    });

    it("includes sections_breakdown with contributions", () => {
      const result = estimateOutputTokens("basic-design", { SCR: 5, TBL: 3 });
      expect(result.sections_breakdown).toHaveLength(2);
      const scrBreakdown = result.sections_breakdown.find(s => s.prefix === "SCR");
      expect(scrBreakdown?.count).toBe(5);
      expect(scrBreakdown?.token_contribution).toBe(4000);
    });

    it("skips entities with zero count", () => {
      const result = estimateOutputTokens("basic-design", { SCR: 0, TBL: 5 });
      expect(result.sections_breakdown).toHaveLength(1);
      expect(result.sections_breakdown[0].prefix).toBe("TBL");
    });

    it("preserves entity_counts in result", () => {
      const counts = { SCR: 10, API: 5 };
      const result = estimateOutputTokens("basic-design", counts);
      expect(result.entity_counts).toEqual(counts);
    });
  });

  describe("formatAdvisory", () => {
    it("contains strategy string", () => {
      const result = estimateOutputTokens("basic-design", { SCR: 20 });
      const advisory = formatAdvisory(result);
      expect(advisory).toContain("progressive");
      expect(advisory).toContain("Token Budget Advisory");
    });

    it("contains entity count table", () => {
      const result = estimateOutputTokens("basic-design", { SCR: 10, TBL: 5 });
      const advisory = formatAdvisory(result);
      expect(advisory).toContain("| SCR |");
      expect(advisory).toContain("| TBL |");
    });

    it("shows split_required warning for large docs", () => {
      const result = estimateOutputTokens("basic-design", { SCR: 40 });
      const advisory = formatAdvisory(result);
      expect(advisory).toContain("split_required");
      expect(advisory).toContain("exceeds safe output limit");
    });

    it("shows monolithic message for small docs", () => {
      const result = estimateOutputTokens("basic-design", { SCR: 5 });
      const advisory = formatAdvisory(result);
      expect(advisory).toContain("single-call generation");
    });
  });
});
