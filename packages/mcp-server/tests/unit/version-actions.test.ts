/**
 * Unit tests for version-actions.ts
 * Tests action dispatch and handlers (bump, query, release, history).
 */
import { describe, it, expect, beforeEach, afterAll } from "@jest/globals";
import { mkdtemp, rm, writeFile, mkdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { stringify as stringifyYaml } from "yaml";
import { handleVersionAction } from "../../src/tools/version-actions.js";
import { writeReleases } from "../../src/lib/version-manager.js";
import type { VersionArgs } from "../../src/tools/version.js";

let tmpDir: string;

beforeEach(async () => {
  tmpDir = await mkdtemp(join(tmpdir(), "sekkei-actions-test-"));
});

afterAll(async () => {
  if (tmpDir) {
    await rm(tmpDir, { recursive: true, force: true });
  }
});

// ── Bump action tests ──

describe("handleVersionAction - bump", () => {
  it("requires doc_type field", async () => {
    const args: VersionArgs = {
      action: "bump",
      workspace_path: tmpDir,
      bump_type: "patch",
      reason: "test",
    };

    const result = await handleVersionAction(args);

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain("doc_type is required");
  });

  it("requires bump_type field", async () => {
    const args: VersionArgs = {
      action: "bump",
      workspace_path: tmpDir,
      doc_type: "requirements",
      reason: "test",
    };

    const result = await handleVersionAction(args);

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain("bump_type is required");
  });

  it("requires reason field", async () => {
    const args: VersionArgs = {
      action: "bump",
      workspace_path: tmpDir,
      doc_type: "requirements",
      bump_type: "patch",
    };

    const result = await handleVersionAction(args);

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain("reason is required");
  });

  it("bumps version and returns old → new", async () => {
    const args: VersionArgs = {
      action: "bump",
      workspace_path: tmpDir,
      doc_type: "requirements",
      bump_type: "patch",
      reason: "Initial specification",
    };

    const result = await handleVersionAction(args);

    expect(result.isError).toBeFalsy();
    expect(result.content[0].text).toContain("0.0.1");
    expect(result.content[0].text).toContain("old_version");
    expect(result.content[0].text).toContain("new_version");
  });

  it("handles minor bump correctly", async () => {
    const setupArgs: VersionArgs = {
      action: "bump",
      workspace_path: tmpDir,
      doc_type: "basic-design",
      bump_type: "patch",
      reason: "setup",
    };
    await handleVersionAction(setupArgs);

    const args: VersionArgs = {
      action: "bump",
      workspace_path: tmpDir,
      doc_type: "basic-design",
      bump_type: "minor",
      reason: "Added new section",
    };

    const result = await handleVersionAction(args);

    expect(result.isError).toBeFalsy();
    expect(result.content[0].text).toContain("0.1.0");
  });
});

// ── Query action tests ──

describe("handleVersionAction - query", () => {
  it("returns version table when no versions tracked", async () => {
    const args: VersionArgs = {
      action: "query",
      workspace_path: tmpDir,
    };

    const result = await handleVersionAction(args);

    expect(result.isError).toBeFalsy();
    expect(result.content[0].text).toContain("Document Versions");
    expect(result.content[0].text).toContain("Tracked");
  });

  it("returns all doc versions when no doc_type filter", async () => {
    const bumpArgs: VersionArgs = {
      action: "bump",
      workspace_path: tmpDir,
      doc_type: "requirements",
      bump_type: "patch",
      reason: "bump",
    };
    await handleVersionAction(bumpArgs);

    const queryArgs: VersionArgs = {
      action: "query",
      workspace_path: tmpDir,
    };

    const result = await handleVersionAction(queryArgs);

    expect(result.isError).toBeFalsy();
    expect(result.content[0].text).toContain("requirements");
    expect(result.content[0].text).toContain("0.0.1");
  });

  it("filters by doc_type when specified", async () => {
    const bumpArgs: VersionArgs = {
      action: "bump",
      workspace_path: tmpDir,
      doc_type: "requirements",
      bump_type: "patch",
      reason: "bump",
    };
    await handleVersionAction(bumpArgs);

    const queryArgs: VersionArgs = {
      action: "query",
      workspace_path: tmpDir,
      doc_type: "requirements",
    };

    const result = await handleVersionAction(queryArgs);

    expect(result.isError).toBeFalsy();
    expect(result.content[0].text).toContain("requirements");
  });
});

// ── Release action tests ──

describe("handleVersionAction - release", () => {
  beforeEach(async () => {
    // Setup: bump a doc version first
    const bumpArgs: VersionArgs = {
      action: "bump",
      workspace_path: tmpDir,
      doc_type: "requirements",
      bump_type: "patch",
      reason: "setup",
    };
    await handleVersionAction(bumpArgs);
  });

  it("requires tag field", async () => {
    const args: VersionArgs = {
      action: "release",
      workspace_path: tmpDir,
      description: "Release notes",
    };

    const result = await handleVersionAction(args);

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain("tag is required");
  });

  it("creates release notes file and returns snapshot", async () => {
    const args: VersionArgs = {
      action: "release",
      workspace_path: tmpDir,
      tag: "v1.0",
      description: "Initial release",
    };

    const result = await handleVersionAction(args);

    expect(result.isError).toBeFalsy();
    expect(result.content[0].text).toContain("v1.0");
    expect(result.content[0].text).toContain("snapshot");
  });

  it("appends to releases array", async () => {
    const args1: VersionArgs = {
      action: "release",
      workspace_path: tmpDir,
      tag: "v1.0",
      description: "First release",
    };
    await handleVersionAction(args1);

    // Bump again
    const bumpArgs: VersionArgs = {
      action: "bump",
      workspace_path: tmpDir,
      doc_type: "requirements",
      bump_type: "minor",
      reason: "minor update",
    };
    await handleVersionAction(bumpArgs);

    const args2: VersionArgs = {
      action: "release",
      workspace_path: tmpDir,
      tag: "v2.0",
      description: "Second release",
    };
    const result = await handleVersionAction(args2);

    expect(result.isError).toBeFalsy();
  });
});

// ── History action tests ──

describe("handleVersionAction - history", () => {
  it("returns empty timeline when no releases", async () => {
    const args: VersionArgs = {
      action: "history",
      workspace_path: tmpDir,
    };

    const result = await handleVersionAction(args);

    expect(result.isError).toBeFalsy();
    expect(result.content[0].text).toContain("current");
    expect(result.content[0].text).toContain("releases");
  });

  it("returns chronological releases", async () => {
    // Create first release
    const bumpArgs1: VersionArgs = {
      action: "bump",
      workspace_path: tmpDir,
      doc_type: "requirements",
      bump_type: "patch",
      reason: "v1",
    };
    await handleVersionAction(bumpArgs1);

    const releaseArgs1: VersionArgs = {
      action: "release",
      workspace_path: tmpDir,
      tag: "v1.0",
      description: "First release",
    };
    await handleVersionAction(releaseArgs1);

    const historyArgs: VersionArgs = {
      action: "history",
      workspace_path: tmpDir,
    };

    const result = await handleVersionAction(historyArgs);

    expect(result.isError).toBeFalsy();
    expect(result.content[0].text).toContain("v1.0");
  });

  it("filters by doc_type when specified", async () => {
    // Setup: bump multiple docs
    const bumpReq: VersionArgs = {
      action: "bump",
      workspace_path: tmpDir,
      doc_type: "requirements",
      bump_type: "patch",
      reason: "req",
    };
    await handleVersionAction(bumpReq);

    const bumpBD: VersionArgs = {
      action: "bump",
      workspace_path: tmpDir,
      doc_type: "basic-design",
      bump_type: "patch",
      reason: "bd",
    };
    await handleVersionAction(bumpBD);

    const releaseArgs: VersionArgs = {
      action: "release",
      workspace_path: tmpDir,
      tag: "v1.0",
      description: "Multi-doc release",
    };
    await handleVersionAction(releaseArgs);

    const historyArgs: VersionArgs = {
      action: "history",
      workspace_path: tmpDir,
      doc_type: "requirements",
    };

    const result = await handleVersionAction(historyArgs);

    expect(result.isError).toBeFalsy();
    expect(result.content[0].text).toContain("v1.0");
  });
});

// ── Unknown action tests ──

describe("handleVersionAction - unknown action", () => {
  it("returns error for unknown action", async () => {
    const args = {
      action: "invalid",
      workspace_path: tmpDir,
    } as unknown as VersionArgs;

    const result = await handleVersionAction(args);

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain("Unknown action");
  });
});
