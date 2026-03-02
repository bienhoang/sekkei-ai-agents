/**
 * Unit tests for version-manager.ts
 * Tests semver functions, releases.yaml I/O, and document version bumping.
 */
import { describe, it, expect, beforeEach, afterAll } from "@jest/globals";
import { mkdtemp, rm, writeFile, mkdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { stringify as stringifyYaml, parse as parseYaml } from "yaml";
import {
  parseSemver,
  formatSemver,
  incrementSemver,
  readReleases,
  writeReleases,
  bumpDocVersion,
  queryVersions,
  releasesFilePath,
} from "../../src/lib/version-manager.js";

let tmpDir: string;

beforeEach(async () => {
  tmpDir = await mkdtemp(join(tmpdir(), "sekkei-version-test-"));
});

afterAll(async () => {
  if (tmpDir) {
    await rm(tmpDir, { recursive: true, force: true });
  }
});

// ── Semver parsing tests ──

describe("parseSemver", () => {
  it("parses valid semver string '1.2.3'", () => {
    const result = parseSemver("1.2.3");
    expect(result).toEqual({ major: 1, minor: 2, patch: 3 });
  });

  it("parses semver with 'v' prefix", () => {
    const result = parseSemver("v1.2.3");
    expect(result).toEqual({ major: 1, minor: 2, patch: 3 });
  });

  it("throws on invalid string 'abc'", () => {
    expect(() => parseSemver("abc")).toThrow("Invalid semver");
  });

  it("throws on partial version '1.2'", () => {
    expect(() => parseSemver("1.2")).toThrow("Invalid semver");
  });

  it("handles large version numbers", () => {
    const result = parseSemver("10.20.30");
    expect(result).toEqual({ major: 10, minor: 20, patch: 30 });
  });
});

// ── Semver formatting tests ──

describe("formatSemver", () => {
  it("formats {1,2,3} as '1.2.3'", () => {
    const version = { major: 1, minor: 2, patch: 3 };
    const result = formatSemver(version);
    expect(result).toBe("1.2.3");
  });

  it("formats large numbers correctly", () => {
    const version = { major: 10, minor: 20, patch: 30 };
    const result = formatSemver(version);
    expect(result).toBe("10.20.30");
  });
});

// ── Semver incrementing tests ──

describe("incrementSemver", () => {
  it("increments patch version: 1.2.3 → 1.2.4", () => {
    const version = { major: 1, minor: 2, patch: 3 };
    const result = incrementSemver(version, "patch");
    expect(result).toEqual({ major: 1, minor: 2, patch: 4 });
  });

  it("increments minor version and resets patch: 1.2.3 → 1.3.0", () => {
    const version = { major: 1, minor: 2, patch: 3 };
    const result = incrementSemver(version, "minor");
    expect(result).toEqual({ major: 1, minor: 3, patch: 0 });
  });

  it("increments major version and resets minor/patch: 1.2.3 → 2.0.0", () => {
    const version = { major: 1, minor: 2, patch: 3 };
    const result = incrementSemver(version, "major");
    expect(result).toEqual({ major: 2, minor: 0, patch: 0 });
  });
});

// ── Releases file I/O tests ──

describe("readReleases / writeReleases", () => {
  it("creates default file if missing (ENOENT)", async () => {
    const result = await readReleases(tmpDir);

    expect(result.format).toBe("semver");
    expect(result.current).toEqual({});
    expect(result.releases).toEqual([]);
  });

  it("writes and reads releases file roundtrip", async () => {
    const original = {
      format: "semver" as const,
      current: { "requirements": "1.0.0", "basic-design": "1.2.0" },
      releases: [
        {
          tag: "v1.0",
          date: "2026-01-01",
          description: "Initial release",
          snapshot: { "requirements": "1.0.0" },
          notes_file: "RELEASE-NOTES-v1.0.md",
        },
      ],
    };

    await writeReleases(tmpDir, original);
    const read = await readReleases(tmpDir);

    expect(read).toEqual(original);
  });

  it("throws VERSION_ERROR on corrupted YAML", async () => {
    const path = releasesFilePath(tmpDir);
    await writeFile(path, "invalid: [unclosed", "utf-8");

    await expect(readReleases(tmpDir)).rejects.toThrow("Failed to read");
  });

  it("handles YAML with null/missing optional fields", async () => {
    const path = releasesFilePath(tmpDir);
    const yaml = "format: semver\ncurrent: {}\nreleases: null\n";
    await writeFile(path, yaml, "utf-8");

    const result = await readReleases(tmpDir);

    expect(result.current).toEqual({});
    expect(result.releases).toEqual([]);
  });
});

// ── bumpDocVersion tests ──

describe("bumpDocVersion", () => {
  it("increments version in releases.yaml current", async () => {
    const result = await bumpDocVersion(tmpDir, "requirements", "patch", "Initial version");

    expect(result.old).toBe("0.0.0");
    expect(result.new).toBe("0.0.1");

    const releases = await readReleases(tmpDir);
    expect(releases.current["requirements"]).toBe("0.0.1");
  });

  it("bumps minor version", async () => {
    await bumpDocVersion(tmpDir, "basic-design", "patch", "v0");
    const result = await bumpDocVersion(tmpDir, "basic-design", "minor", "Minor update");

    expect(result.old).toBe("0.0.1");
    expect(result.new).toBe("0.1.0");
  });

  it("bumps major version", async () => {
    await bumpDocVersion(tmpDir, "detail-design", "patch", "v0");
    await bumpDocVersion(tmpDir, "detail-design", "minor", "v1");
    const result = await bumpDocVersion(tmpDir, "detail-design", "major", "Major milestone");

    expect(result.new).toBe("1.0.0");
  });

  it("creates releases.yaml if missing (first bump)", async () => {
    const releasesPath = releasesFilePath(tmpDir);
    const result = await bumpDocVersion(tmpDir, "nfr", "patch", "First bump");

    expect(result.old).toBe("0.0.0");
    expect(result.new).toBe("0.0.1");

    const releases = await readReleases(tmpDir);
    expect(releases.current["nfr"]).toBe("0.0.1");
  });

  it("returns old and new version strings", async () => {
    await bumpDocVersion(tmpDir, "functions-list", "patch", "v0");
    const result = await bumpDocVersion(tmpDir, "functions-list", "patch", "v1");

    expect(typeof result.old).toBe("string");
    expect(typeof result.new).toBe("string");
    expect(result.old).toBe("0.0.1");
    expect(result.new).toBe("0.0.2");
  });
});

// ── queryVersions tests ──

describe("queryVersions", () => {
  it("returns empty object when no versions tracked", async () => {
    const result = await queryVersions(tmpDir);

    expect(result.versions).toEqual({});
    expect(result.mismatches).toEqual([]);
  });

  it("returns all doc versions when no doc_type filter", async () => {
    await bumpDocVersion(tmpDir, "requirements", "patch", "req bump");
    await bumpDocVersion(tmpDir, "basic-design", "patch", "bd bump");

    const result = await queryVersions(tmpDir);

    expect(Object.keys(result.versions)).toContain("requirements");
    expect(Object.keys(result.versions)).toContain("basic-design");
    expect(result.versions["requirements"].tracked).toBe("0.0.1");
    expect(result.versions["basic-design"].tracked).toBe("0.0.1");
  });

  it("filters by doc_type when specified", async () => {
    await bumpDocVersion(tmpDir, "requirements", "patch", "req");
    await bumpDocVersion(tmpDir, "basic-design", "patch", "bd");

    const result = await queryVersions(tmpDir, "requirements");

    expect(Object.keys(result.versions)).toEqual(["requirements"]);
    expect(result.versions["requirements"].tracked).toBe("0.0.1");
  });

  it("reports mismatches between actual and tracked (when no doc file)", async () => {
    const releases = {
      format: "semver" as const,
      current: { "requirements": "1.0.0", "basic-design": "2.0.0" },
      releases: [],
    };
    await writeReleases(tmpDir, releases);

    const result = await queryVersions(tmpDir);

    // Without doc files, actual defaults to tracked
    expect(result.versions["requirements"].match).toBe(true);
    expect(result.mismatches).toEqual([]);
  });
});
