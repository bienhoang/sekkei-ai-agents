/**
 * Unit tests for staleness-detector.ts
 * Mocks simple-git and node:fs/promises for ESM-compatible testing.
 */
import { describe, it, expect, jest, beforeEach } from "@jest/globals";

// ── Mocks (must register before dynamic imports) ──────────────────────────────

const mockReadFile = jest.fn<() => Promise<string>>();
jest.unstable_mockModule("node:fs/promises", () => ({
  readFile: mockReadFile,
}));

const mockLog = jest.fn();
const mockRaw = jest.fn();
const mockGitInstance = { log: mockLog, raw: mockRaw };
const mockSimpleGit = jest.fn(() => mockGitInstance);

jest.unstable_mockModule("simple-git", () => ({
  simpleGit: mockSimpleGit,
}));

// Dynamic import after mocks
const { detectStaleness } = await import("../../src/lib/staleness-detector.js");

// ── Helpers ───────────────────────────────────────────────────────────────────

const MINIMAL_CONFIG = {
  project: { name: "test", type: "web", stack: [], team_size: 1, language: "ja", keigo: "丁寧語" },
  output: { directory: "output" },
  chain: { rfp: "", overview: { status: "pending" }, functions_list: { status: "pending" },
    requirements: { status: "pending" }, basic_design: { status: "pending" },
    detail_design: { status: "pending" }, test_spec: { status: "pending" } },
};

function configWithFeatureMap(featureMap: Record<string, { label: string; files: string[] }>) {
  return JSON.stringify({ ...MINIMAL_CONFIG, feature_file_map: featureMap });
}

function setupGitSuccess(changedFiles: string[] = [], statOutput = "", tagName = "") {
  // git log succeeds (repo verification)
  mockLog.mockResolvedValue({ latest: { aI: new Date(Date.now() - 5 * 86_400_000).toISOString() } });
  mockRaw
    // git describe --tags
    .mockResolvedValueOnce(tagName || (() => { throw new Error("no tag"); })())
    // git diff --name-only
    .mockResolvedValueOnce(changedFiles.join("\n"))
    // git diff --stat
    .mockResolvedValueOnce(statOutput);
}

beforeEach(() => {
  jest.clearAllMocks();
});

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("detectStaleness — empty feature_file_map", () => {
  it("returns empty report when feature_file_map missing", async () => {
    mockReadFile.mockResolvedValueOnce(JSON.stringify(MINIMAL_CONFIG));

    const report = await detectStaleness("/project/sekkei.config.yaml");

    expect(report.features).toHaveLength(0);
    expect(report.staleCount).toBe(0);
    expect(report.overallScore).toBe(0);
    expect(report.summary).toMatch(/No features configured/);
  });
});

describe("detectStaleness — not a git repo", () => {
  it("throws SekkeiError STALENESS_ERROR when git log fails", async () => {
    mockReadFile.mockResolvedValueOnce(
      configWithFeatureMap({ "F-001": { label: "Auth", files: ["src/auth/**"] } })
    );
    mockLog.mockRejectedValueOnce(new Error("not a git repository"));

    await expect(detectStaleness("/project/sekkei.config.yaml")).rejects.toMatchObject({
      code: "STALENESS_ERROR",
    });
  });
});

describe("detectStaleness — glob matching", () => {
  it("matches files against ** glob patterns", async () => {
    mockReadFile.mockResolvedValueOnce(
      configWithFeatureMap({
        "F-001": { label: "Auth", files: ["src/auth/**"] },
        "F-002": { label: "Dashboard", files: ["src/dashboard/**", "src/widgets/*.ts"] },
      })
    );

    mockLog.mockResolvedValue({ latest: { aI: new Date(Date.now() - 10 * 86_400_000).toISOString() } });
    mockRaw
      .mockRejectedValueOnce(new Error("no tag")) // describe --tags fails → use 30d
      .mockResolvedValueOnce("src/auth/login.ts\nsrc/auth/token.ts\nsrc/unrelated/foo.ts")
      .mockResolvedValueOnce("3 files changed, 50 insertions(+), 10 deletions(-)");

    const report = await detectStaleness("/project/sekkei.config.yaml");

    const f001 = report.features.find((f) => f.featureId === "F-001");
    const f002 = report.features.find((f) => f.featureId === "F-002");

    expect(f001?.changedFiles).toHaveLength(2);
    expect(f001?.changedFiles).toContain("src/auth/login.ts");
    expect(f002?.changedFiles).toHaveLength(0);
    expect(f002?.score).toBe(0);
  });

  it("matches single-star patterns without crossing directory boundaries", async () => {
    mockReadFile.mockResolvedValueOnce(
      configWithFeatureMap({
        "REQ-001": { label: "API", files: ["src/*.ts"] },
      })
    );

    mockLog.mockResolvedValue({ latest: null });
    mockRaw
      .mockRejectedValueOnce(new Error("no tag"))
      .mockResolvedValueOnce("src/index.ts\nsrc/sub/deep.ts")
      .mockResolvedValueOnce("2 files changed, 20 insertions(+)");

    const report = await detectStaleness("/project/sekkei.config.yaml");

    const r001 = report.features.find((f) => f.featureId === "REQ-001");
    // src/index.ts matches src/*.ts; src/sub/deep.ts does NOT match src/*.ts
    expect(r001?.changedFiles).toHaveLength(1);
    expect(r001?.changedFiles).toContain("src/index.ts");
  });
});

describe("detectStaleness — scoring formula", () => {
  it("calculates score with known inputs: 45 days, 5 files, 250 lines → expected 42", async () => {
    // score = round(clamp(45/90,0,1)*40 + clamp(5/10,0,1)*30 + clamp(250/500,0,1)*30)
    //       = round(0.5*40 + 0.5*30 + 0.5*30) = round(20+15+15) = 50
    // (Note: with 5 matched out of 5 total, linesForFeature = 250)
    const docDate = new Date(Date.now() - 45 * 86_400_000).toISOString();
    mockReadFile.mockResolvedValueOnce(
      configWithFeatureMap({
        "F-010": { label: "Feature", files: ["src/feature/**"] },
      })
    );

    mockLog.mockResolvedValue({ latest: { aI: docDate } });
    const files = ["src/feature/a.ts", "src/feature/b.ts", "src/feature/c.ts", "src/feature/d.ts", "src/feature/e.ts"];
    mockRaw
      .mockRejectedValueOnce(new Error("no tag"))
      .mockResolvedValueOnce(files.join("\n"))
      .mockResolvedValueOnce("5 files changed, 250 insertions(+)");

    const report = await detectStaleness("/project/sekkei.config.yaml");
    const f = report.features[0];
    // All 5 files matched out of 5 total → linesForFeature = 250
    // daysSince ≈ 45
    expect(f.score).toBe(50);
    expect(f.changedFiles).toHaveLength(5);
  });

  it("score is 0 when no files changed for that feature", async () => {
    mockReadFile.mockResolvedValueOnce(
      configWithFeatureMap({
        "F-020": { label: "Unrelated", files: ["src/unrelated/**"] },
      })
    );
    mockLog.mockResolvedValue({ latest: null });
    mockRaw
      .mockRejectedValueOnce(new Error("no tag"))
      .mockResolvedValueOnce("src/other/file.ts")
      .mockResolvedValueOnce("1 file changed, 5 insertions(+)");

    const report = await detectStaleness("/project/sekkei.config.yaml");
    expect(report.features[0].score).toBe(0);
  });
});

describe("detectStaleness — empty diff", () => {
  it("returns all scores 0 when no files changed", async () => {
    mockReadFile.mockResolvedValueOnce(
      configWithFeatureMap({
        "F-001": { label: "Auth", files: ["src/auth/**"] },
        "F-002": { label: "Dashboard", files: ["src/dashboard/**"] },
      })
    );
    mockLog.mockResolvedValue({ latest: null });
    mockRaw
      .mockRejectedValueOnce(new Error("no tag"))
      .mockResolvedValueOnce("")   // empty diff
      .mockResolvedValueOnce("");  // empty stat

    const report = await detectStaleness("/project/sekkei.config.yaml");
    expect(report.overallScore).toBe(0);
    expect(report.staleCount).toBe(0);
    report.features.forEach((f) => expect(f.score).toBe(0));
  });
});

describe("detectStaleness — threshold filtering", () => {
  it("counts staleCount based on threshold", async () => {
    mockReadFile.mockResolvedValueOnce(
      configWithFeatureMap({
        "F-001": { label: "Auth", files: ["src/auth/**"] },
        "F-002": { label: "Other", files: ["src/other/**"] },
      })
    );
    const oldDate = new Date(Date.now() - 100 * 86_400_000).toISOString();
    mockLog.mockResolvedValue({ latest: { aI: oldDate } });
    mockRaw
      .mockRejectedValueOnce(new Error("no tag"))
      // F-001 matches 10 files; F-002 matches none
      .mockResolvedValueOnce(Array.from({ length: 10 }, (_, i) => `src/auth/f${i}.ts`).join("\n"))
      .mockResolvedValueOnce("10 files changed, 600 insertions(+)");

    const report = await detectStaleness("/project/sekkei.config.yaml", { threshold: 50 });
    // F-001 should be stale (score = 100), F-002 should not
    expect(report.staleCount).toBe(1);
  });
});

describe("detectStaleness — since ref parsing", () => {
  it("converts '30d' to --since flag format", async () => {
    mockReadFile.mockResolvedValueOnce(
      configWithFeatureMap({ "F-001": { label: "Auth", files: ["src/**"] } })
    );
    mockLog.mockResolvedValue({ latest: null });
    mockRaw
      .mockResolvedValueOnce("")  // diff --name-only with --since flag
      .mockResolvedValueOnce(""); // diff --stat with --since flag

    await detectStaleness("/project/sekkei.config.yaml", { since: "30d" });

    // First raw call should use --since flag, not tag..HEAD
    const firstCall = mockRaw.mock.calls[0] as string[][];
    expect(firstCall[0]).toContain("--since=\"30 days ago\"");
  });

  it("uses tag directly when since is a tag name", async () => {
    mockReadFile.mockResolvedValueOnce(
      configWithFeatureMap({ "F-001": { label: "Auth", files: ["src/**"] } })
    );
    mockLog.mockResolvedValue({ latest: null });
    mockRaw
      .mockResolvedValueOnce("")
      .mockResolvedValueOnce("");

    await detectStaleness("/project/sekkei.config.yaml", { since: "v1.2.0" });

    const firstCall = mockRaw.mock.calls[0] as string[][];
    expect(firstCall[0]).toContain("v1.2.0..HEAD");
  });
});

describe("detectStaleness — affected doc types", () => {
  it("maps feature ID prefixes to correct doc types", async () => {
    mockReadFile.mockResolvedValueOnce(
      configWithFeatureMap({
        "F-001": { label: "Feature", files: ["src/feature/**"] },
        "REQ-001": { label: "Req", files: ["src/req/**"] },
        "SCR-001": { label: "Screen", files: ["src/screen/**"] },
      })
    );
    mockLog.mockResolvedValue({ latest: null });
    mockRaw
      .mockRejectedValueOnce(new Error("no tag"))
      .mockResolvedValueOnce("")
      .mockResolvedValueOnce("");

    const report = await detectStaleness("/project/sekkei.config.yaml");

    const f = report.features.find((x) => x.featureId === "F-001");
    const r = report.features.find((x) => x.featureId === "REQ-001");
    const s = report.features.find((x) => x.featureId === "SCR-001");

    expect(f?.affectedDocTypes).toContain("functions-list");
    expect(r?.affectedDocTypes).toContain("basic-design");
    expect(s?.affectedDocTypes).toContain("detail-design");
  });
});
