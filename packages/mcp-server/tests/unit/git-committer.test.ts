/**
 * Unit tests for git-committer.ts
 * Uses jest.unstable_mockModule for ESM-compatible mocking of node:child_process.
 */
import { describe, it, expect, jest, beforeEach } from "@jest/globals";

// Must use unstable_mockModule + dynamic import pattern for ESM
const mockExecFile = jest.fn();

jest.unstable_mockModule("node:child_process", () => ({
  execFile: mockExecFile,
}));

// Dynamic imports AFTER mock registration
const { isGitRepo, autoCommit } = await import("../../src/lib/git-committer.js");

type ExecCallback = (err: Error | null, stdout: string, stderr: string) => void;

function succeedWith(stdout = ""): void {
  mockExecFile.mockImplementation(
    (_cmd: unknown, _args: unknown, _opts: unknown, cb: ExecCallback) => {
      cb(null, stdout, "");
    }
  );
}

function failWith(code: number, message: string): void {
  mockExecFile.mockImplementation(
    (_cmd: unknown, _args: unknown, _opts: unknown, cb: ExecCallback) => {
      cb(Object.assign(new Error(message), { code }), "", message);
    }
  );
}

beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(process.stderr, "write").mockImplementation(() => true);
});

// ─────────────────────────────────────────────────────────────────────────────
describe("isGitRepo", () => {
  it("returns true when git rev-parse succeeds", async () => {
    succeedWith("true");
    const result = await isGitRepo("/some/dir");
    expect(result).toBe(true);
    expect(mockExecFile).toHaveBeenCalledWith(
      "git",
      ["rev-parse", "--is-inside-work-tree"],
      expect.objectContaining({ cwd: "/some/dir" }),
      expect.any(Function)
    );
  });

  it("returns false when git rev-parse fails (not a git repo)", async () => {
    failWith(128, "not a git repository");
    const result = await isGitRepo("/not/a/repo");
    expect(result).toBe(false);
  });

  it("returns false when git is not installed", async () => {
    failWith(127, "git: command not found");
    const result = await isGitRepo("/any/dir");
    expect(result).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe("autoCommit", () => {
  it("skips commit when directory is not a git repo (logs, does not throw)", async () => {
    failWith(128, "not a git repository");

    await expect(autoCommit("/not/a/repo/doc.md", "requirements")).resolves.toBeUndefined();

    // Only rev-parse should have been called — no git add/commit
    expect(mockExecFile).toHaveBeenCalledTimes(1);
    expect(mockExecFile).toHaveBeenCalledWith(
      "git",
      ["rev-parse", "--is-inside-work-tree"],
      expect.any(Object),
      expect.any(Function)
    );
  });

  it("calls git add and git commit with correct args when in a git repo", async () => {
    mockExecFile
      .mockImplementationOnce((_c: unknown, _a: unknown, _o: unknown, cb: ExecCallback) => cb(null, "true", ""))
      .mockImplementationOnce((_c: unknown, _a: unknown, _o: unknown, cb: ExecCallback) => cb(null, "", ""))
      .mockImplementationOnce((_c: unknown, _a: unknown, _o: unknown, cb: ExecCallback) =>
        cb(null, "[main abc1234] sekkei: update requirements", "")
      );

    await expect(autoCommit("/project/output/requirements.md", "requirements")).resolves.toBeUndefined();

    expect(mockExecFile).toHaveBeenCalledTimes(3);

    // git add
    expect(mockExecFile).toHaveBeenNthCalledWith(
      2,
      "git",
      ["add", "/project/output/requirements.md"],
      expect.objectContaining({ cwd: "/project/output" }),
      expect.any(Function)
    );

    // git commit
    expect(mockExecFile).toHaveBeenNthCalledWith(
      3,
      "git",
      ["commit", "-m", "sekkei: update requirements"],
      expect.objectContaining({ cwd: "/project/output" }),
      expect.any(Function)
    );
  });

  it("treats exit code 1 from git commit as 'nothing to commit' — does not throw", async () => {
    mockExecFile
      .mockImplementationOnce((_c: unknown, _a: unknown, _o: unknown, cb: ExecCallback) => cb(null, "true", ""))
      .mockImplementationOnce((_c: unknown, _a: unknown, _o: unknown, cb: ExecCallback) => cb(null, "", ""))
      .mockImplementationOnce((_c: unknown, _a: unknown, _o: unknown, cb: ExecCallback) =>
        cb(Object.assign(new Error("nothing to commit"), { code: 1 }), "", "nothing to commit")
      );

    await expect(autoCommit("/project/output/doc.md", "basic-design")).resolves.toBeUndefined();
    expect(mockExecFile).toHaveBeenCalledTimes(3);
  });

  it("never throws even when git add fails", async () => {
    mockExecFile
      .mockImplementationOnce((_c: unknown, _a: unknown, _o: unknown, cb: ExecCallback) => cb(null, "true", ""))
      .mockImplementationOnce((_c: unknown, _a: unknown, _o: unknown, cb: ExecCallback) =>
        cb(Object.assign(new Error("permission denied"), { code: 1 }), "", "permission denied")
      );

    await expect(autoCommit("/locked/output/doc.md", "test-spec")).resolves.toBeUndefined();
  });
});
