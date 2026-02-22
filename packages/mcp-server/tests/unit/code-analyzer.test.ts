import { describe, test, expect } from "@jest/globals";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { analyzeTypeScript } from "../../src/lib/code-analyzer.js";
import { SekkeiError } from "../../src/lib/errors.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const FIXTURES_DIR = resolve(__dirname, "../fixtures/sample-project");

describe("analyzeTypeScript — class extraction", () => {
  test("extracts UserService class with methods and property", async () => {
    const ctx = await analyzeTypeScript(FIXTURES_DIR);
    const cls = ctx.classes.find((c) => c.name === "UserService");
    expect(cls).toBeDefined();
    expect(cls!.methods.length).toBeGreaterThanOrEqual(2);
    const methodNames = cls!.methods.map((m) => m.name);
    expect(methodNames).toContain("findById");
    expect(methodNames).toContain("create");
    // db is private property
    expect(cls!.properties.some((p) => p.name === "db")).toBe(true);
  });

  test("extracts UserEntity class", async () => {
    const ctx = await analyzeTypeScript(FIXTURES_DIR);
    const cls = ctx.classes.find((c) => c.name === "UserEntity");
    expect(cls).toBeDefined();
  });
});

describe("analyzeTypeScript — endpoint detection", () => {
  test("detects 3 HTTP routes from user.controller.ts", async () => {
    const ctx = await analyzeTypeScript(FIXTURES_DIR);
    // Filter endpoints from controller file
    const endpoints = ctx.apiEndpoints.filter((ep) =>
      ep.filePath.includes("user.controller")
    );
    expect(endpoints.length).toBe(3);
    const methods = endpoints.map((e) => e.method);
    expect(methods).toContain("GET");
    expect(methods).toContain("POST");
  });

  test("endpoint paths are extracted correctly", async () => {
    const ctx = await analyzeTypeScript(FIXTURES_DIR);
    const paths = ctx.apiEndpoints.map((e) => e.path);
    expect(paths).toContain("/api/users");
    expect(paths).toContain("/api/users/:id");
  });
});

describe("analyzeTypeScript — entity detection", () => {
  test("detects UserEntity with columns", async () => {
    const ctx = await analyzeTypeScript(FIXTURES_DIR);
    const entity = ctx.dbEntities.find((e) => e.name === "UserEntity");
    expect(entity).toBeDefined();
    // id (PrimaryGeneratedColumn), name, email columns
    expect(entity!.columns.length).toBeGreaterThanOrEqual(3);
    const colNames = entity!.columns.map((c) => c.name);
    expect(colNames).toContain("name");
    expect(colNames).toContain("email");
  });

  test("detects ManyToOne relation on UserEntity", async () => {
    const ctx = await analyzeTypeScript(FIXTURES_DIR);
    const entity = ctx.dbEntities.find((e) => e.name === "UserEntity");
    expect(entity).toBeDefined();
    expect(entity!.relations.length).toBeGreaterThanOrEqual(1);
    expect(entity!.relations[0].type).toBe("ManyToOne");
    expect(entity!.relations[0].name).toBe("organization");
  });

  test("email column is nullable", async () => {
    const ctx = await analyzeTypeScript(FIXTURES_DIR);
    const entity = ctx.dbEntities.find((e) => e.name === "UserEntity");
    const emailCol = entity?.columns.find((c) => c.name === "email");
    expect(emailCol?.nullable).toBe(true);
  });
});

describe("analyzeTypeScript — file count", () => {
  test("counts source files correctly", async () => {
    const ctx = await analyzeTypeScript(FIXTURES_DIR);
    // 3 fixture files: user.service.ts, user.controller.ts, user.entity.ts
    expect(ctx.fileCount).toBeGreaterThanOrEqual(3);
  });
});

describe("analyzeTypeScript — error handling", () => {
  test("throws SekkeiError when path does not exist", async () => {
    await expect(
      analyzeTypeScript("/nonexistent/path/that/does/not/exist")
    ).rejects.toMatchObject({ code: "CODE_ANALYSIS_FAILED" });
  });

  test("throws SekkeiError instance for missing path", async () => {
    try {
      await analyzeTypeScript("/no/such/path");
    } catch (err) {
      expect(err).toBeInstanceOf(SekkeiError);
      expect((err as SekkeiError).code).toBe("CODE_ANALYSIS_FAILED");
    }
  });
});
