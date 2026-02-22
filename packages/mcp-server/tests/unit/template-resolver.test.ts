/**
 * Tests for template-resolver — override directory resolution logic.
 */
import { describe, it, expect, beforeAll, afterAll } from "@jest/globals";
import { resolveTemplatePath } from "../../src/lib/template-resolver.js";
import { mkdirSync, writeFileSync, rmSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const TMP_DIR = resolve(__dirname, "../tmp/resolver");
const DEFAULT_DIR = resolve(TMP_DIR, "default");
const OVERRIDE_DIR = resolve(TMP_DIR, "override");

beforeAll(() => {
  mkdirSync(resolve(DEFAULT_DIR, "ja"), { recursive: true });
  mkdirSync(resolve(OVERRIDE_DIR, "ja"), { recursive: true });
  writeFileSync(resolve(DEFAULT_DIR, "ja/functions-list.md"), "default");
  writeFileSync(resolve(OVERRIDE_DIR, "ja/functions-list.md"), "override");
  writeFileSync(resolve(DEFAULT_DIR, "ja/requirements.md"), "default-req");
});

afterAll(() => {
  rmSync(TMP_DIR, { recursive: true, force: true });
});

describe("resolveTemplatePath", () => {
  it("returns default path when no override dir", async () => {
    const result = await resolveTemplatePath(DEFAULT_DIR, "functions-list", "ja");
    expect(result).toBe(resolve(DEFAULT_DIR, "ja/functions-list.md"));
  });

  it("returns override path when override exists", async () => {
    const result = await resolveTemplatePath(DEFAULT_DIR, "functions-list", "ja", OVERRIDE_DIR);
    expect(result).toBe(resolve(OVERRIDE_DIR, "ja/functions-list.md"));
  });

  it("falls back to default when override file missing", async () => {
    const result = await resolveTemplatePath(DEFAULT_DIR, "requirements", "ja", OVERRIDE_DIR);
    expect(result).toBe(resolve(DEFAULT_DIR, "ja/requirements.md"));
  });

  it("returns default when override dir does not exist", async () => {
    const result = await resolveTemplatePath(DEFAULT_DIR, "functions-list", "ja", "/nonexistent/dir");
    expect(result).toBe(resolve(DEFAULT_DIR, "ja/functions-list.md"));
  });
});
