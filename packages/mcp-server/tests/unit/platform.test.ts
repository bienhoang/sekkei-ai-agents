import { dirname, resolve, join } from "node:path";
import { fileURLToPath } from "node:url";
import { isSubPath, getVenvPython, commandExists, isWin } from "../../src/lib/platform.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

describe("platform utilities", () => {
  describe("isWin", () => {
    it("should be a boolean", () => {
      expect(typeof isWin).toBe("boolean");
    });
  });

  describe("isSubPath", () => {
    it("returns true for child inside parent", () => {
      const parent = resolve(__dirname, "..");
      const child = resolve(__dirname, "../fixtures/sample.md");
      expect(isSubPath(child, parent)).toBe(true);
    });

    it("returns true when child equals parent", () => {
      const dir = resolve(__dirname);
      expect(isSubPath(dir, dir)).toBe(true);
    });

    it("returns false for sibling directory", () => {
      const parent = resolve(__dirname, "../unit");
      const child = resolve(__dirname, "../integration/some-file.ts");
      expect(isSubPath(child, parent)).toBe(false);
    });

    it("returns false for prefix-similar directory names", () => {
      // Regression: templates/ja-extra should NOT pass for base templates/ja
      const parent = join("/tmp", "templates", "ja");
      const child = join("/tmp", "templates", "ja-extra", "file.md");
      expect(isSubPath(child, parent)).toBe(false);
    });

    it("returns false for path traversal attempt", () => {
      const parent = resolve(__dirname, "../fixtures");
      const child = resolve(__dirname, "../fixtures/../../etc/passwd");
      expect(isSubPath(child, parent)).toBe(false);
    });
  });

  describe("getVenvPython", () => {
    it("returns path ending with python executable", () => {
      const result = getVenvPython("/project");
      if (isWin) {
        expect(result).toContain("Scripts");
        expect(result).toContain("python.exe");
      } else {
        expect(result).toContain("bin");
        expect(result).toContain("python3");
      }
    });

    it("includes .venv directory", () => {
      const result = getVenvPython("/project");
      expect(result).toContain(".venv");
    });
  });

  describe("commandExists", () => {
    it("returns true for node", () => {
      expect(commandExists("node")).toBe(true);
    });

    it("returns false for nonexistent command", () => {
      expect(commandExists("__surely_this_does_not_exist_xyz__")).toBe(false);
    });
  });
});
