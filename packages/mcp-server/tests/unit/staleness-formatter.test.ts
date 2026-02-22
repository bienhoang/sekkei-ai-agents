/**
 * Unit tests for staleness-formatter.ts
 */
import { describe, it, expect } from "@jest/globals";
import { formatStalenessReport } from "../../src/lib/staleness-formatter.js";
import type { StalenessReport } from "../../src/lib/staleness-detector.js";

function makeReport(overrides: Partial<StalenessReport> = {}): StalenessReport {
  return {
    repoRoot: "/project",
    sinceRef: "v1.0.0",
    scanDate: "2026-02-23T00:00:00.000Z",
    features: [],
    overallScore: 0,
    staleCount: 0,
    summary: "0/0 features stale",
    ...overrides,
  };
}

describe("formatStalenessReport — empty report", () => {
  it("returns no-features message when features array is empty", () => {
    const output = formatStalenessReport(makeReport());
    expect(output).toBe("No features configured for staleness tracking.");
  });
});

describe("formatStalenessReport — markdown structure", () => {
  it("includes correct headers and metadata", () => {
    const report = makeReport({
      features: [
        {
          featureId: "F-001",
          label: "Authentication",
          score: 75,
          changedFiles: ["src/auth/login.ts", "src/auth/token.ts"],
          linesChanged: 120,
          lastDocUpdate: "2026-01-01T00:00:00.000Z",
          daysSinceDocUpdate: 53,
          affectedDocTypes: ["functions-list", "requirements"],
        },
      ],
      overallScore: 75,
      staleCount: 1,
      summary: "1/1 features stale",
    });

    const output = formatStalenessReport(report);

    expect(output).toContain("# Staleness Report");
    expect(output).toContain("**Repo:** /project");
    expect(output).toContain("**Since:** v1.0.0");
    expect(output).toContain("**Overall Score:** 75/100");
    expect(output).toContain("**Stale Features:** 1/1");
    expect(output).toContain("| Feature | Label | Score |");
  });

  it("renders STALE status for score >= 50", () => {
    const report = makeReport({
      features: [
        {
          featureId: "F-001",
          label: "Auth",
          score: 80,
          changedFiles: ["src/auth.ts"],
          linesChanged: 200,
          lastDocUpdate: null,
          daysSinceDocUpdate: 60,
          affectedDocTypes: ["functions-list"],
        },
      ],
      overallScore: 80,
      staleCount: 1,
      summary: "1/1 features stale",
    });

    const output = formatStalenessReport(report);
    expect(output).toContain("STALE");
    expect(output).not.toContain("WARN");
    expect(output).not.toContain("OK");
  });

  it("renders WARN status for score 25–49", () => {
    const report = makeReport({
      features: [
        {
          featureId: "F-002",
          label: "Dashboard",
          score: 30,
          changedFiles: ["src/dashboard.ts"],
          linesChanged: 50,
          lastDocUpdate: "2026-02-01T00:00:00.000Z",
          daysSinceDocUpdate: 22,
          affectedDocTypes: ["basic-design"],
        },
      ],
      overallScore: 30,
      staleCount: 0,
      summary: "0/1 features stale",
    });

    const output = formatStalenessReport(report);
    expect(output).toContain("WARN");
    expect(output).not.toContain("STALE");
  });

  it("renders OK status for score < 25", () => {
    const report = makeReport({
      features: [
        {
          featureId: "F-003",
          label: "Settings",
          score: 0,
          changedFiles: [],
          linesChanged: 0,
          lastDocUpdate: "2026-02-20T00:00:00.000Z",
          daysSinceDocUpdate: 3,
          affectedDocTypes: ["requirements"],
        },
      ],
      overallScore: 0,
      staleCount: 0,
      summary: "0/1 features stale",
    });

    const output = formatStalenessReport(report);
    expect(output).toContain("OK");
    expect(output).not.toContain("STALE");
    expect(output).not.toContain("WARN");
  });

  it("includes Recommended Actions section only for STALE features", () => {
    const report = makeReport({
      features: [
        {
          featureId: "F-001",
          label: "Auth",
          score: 80,
          changedFiles: ["src/auth.ts"],
          linesChanged: 300,
          lastDocUpdate: null,
          daysSinceDocUpdate: 90,
          affectedDocTypes: ["functions-list", "requirements"],
        },
        {
          featureId: "F-002",
          label: "Settings",
          score: 10,
          changedFiles: [],
          linesChanged: 0,
          lastDocUpdate: "2026-02-20T00:00:00.000Z",
          daysSinceDocUpdate: 3,
          affectedDocTypes: ["requirements"],
        },
      ],
      overallScore: 45,
      staleCount: 1,
      summary: "1/2 features stale",
    });

    const output = formatStalenessReport(report);
    expect(output).toContain("## Recommended Actions");
    expect(output).toContain("F-001");
    expect(output).toContain("functions-list, requirements");
    // F-002 should not appear in recommended actions (score 10)
    const actionsSection = output.split("## Recommended Actions")[1] ?? "";
    expect(actionsSection).not.toContain("F-002");
  });

  it("omits Recommended Actions section when no features are stale", () => {
    const report = makeReport({
      features: [
        {
          featureId: "F-001",
          label: "Auth",
          score: 20,
          changedFiles: [],
          linesChanged: 0,
          lastDocUpdate: "2026-02-20T00:00:00.000Z",
          daysSinceDocUpdate: 3,
          affectedDocTypes: ["requirements"],
        },
      ],
      overallScore: 20,
      staleCount: 0,
      summary: "0/1 features stale",
    });

    const output = formatStalenessReport(report);
    expect(output).not.toContain("## Recommended Actions");
  });

  it("shows 'never' for null lastDocUpdate", () => {
    const report = makeReport({
      features: [
        {
          featureId: "F-001",
          label: "Auth",
          score: 60,
          changedFiles: ["src/auth.ts"],
          linesChanged: 100,
          lastDocUpdate: null,
          daysSinceDocUpdate: 0,
          affectedDocTypes: ["functions-list"],
        },
      ],
      overallScore: 60,
      staleCount: 1,
      summary: "1/1 features stale",
    });

    const output = formatStalenessReport(report);
    expect(output).toContain("never");
  });
});
