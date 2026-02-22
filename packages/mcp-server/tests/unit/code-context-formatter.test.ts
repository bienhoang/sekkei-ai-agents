import { describe, test, expect } from "@jest/globals";
import { formatCodeContext } from "../../src/lib/code-context-formatter.js";
import type { CodeContext } from "../../src/lib/code-analyzer.js";

const EMPTY_CTX: CodeContext = {
  classes: [],
  functions: [],
  apiEndpoints: [],
  dbEntities: [],
  fileCount: 0,
  parseErrors: [],
};

const FULL_CTX: CodeContext = {
  classes: [
    {
      name: "UserService",
      methods: [{ name: "findById", params: "id: string", returnType: "Promise<User | null>" }],
      properties: [{ name: "db", type: "any" }],
      extends: undefined,
      implements: undefined,
    },
  ],
  functions: [
    { name: "createUser", params: "data: CreateUserDto", returnType: "Promise<User>", exported: true, filePath: "/src/user.service.ts" },
  ],
  apiEndpoints: [
    { method: "GET", path: "/api/users", handlerName: "async (req, res) =>", filePath: "/src/user.controller.ts" },
    { method: "POST", path: "/api/users", handlerName: "async (req, res) =>", filePath: "/src/user.controller.ts" },
  ],
  dbEntities: [
    {
      name: "UserEntity",
      columns: [
        { name: "id", type: "string", nullable: false },
        { name: "email", type: "string", nullable: true },
      ],
      relations: [{ name: "organization", type: "ManyToOne", target: "Organization" }],
    },
  ],
  fileCount: 3,
  parseErrors: [],
};

describe("formatCodeContext — empty context", () => {
  test("returns empty string when all arrays empty and no errors", () => {
    const result = formatCodeContext(EMPTY_CTX);
    expect(result).toBe("");
  });
});

describe("formatCodeContext — full context", () => {
  test("contains top-level header", () => {
    const result = formatCodeContext(FULL_CTX);
    expect(result).toContain("## Source Code Context");
  });

  test("contains Classes section with count", () => {
    const result = formatCodeContext(FULL_CTX);
    expect(result).toContain("### Classes (1 found)");
    expect(result).toContain("UserService");
  });

  test("contains Exported Functions section", () => {
    const result = formatCodeContext(FULL_CTX);
    expect(result).toContain("### Exported Functions (1 found)");
    expect(result).toContain("createUser");
  });

  test("contains API Endpoints section with methods and paths", () => {
    const result = formatCodeContext(FULL_CTX);
    expect(result).toContain("### API Endpoints (2 found)");
    expect(result).toContain("GET");
    expect(result).toContain("/api/users");
    expect(result).toContain("POST");
  });

  test("contains Database Entities section", () => {
    const result = formatCodeContext(FULL_CTX);
    expect(result).toContain("### Database Entities (1 found)");
    expect(result).toContain("UserEntity");
    expect(result).toContain("ManyToOne");
  });

  test("formats nullable columns with ? suffix", () => {
    const result = formatCodeContext(FULL_CTX);
    expect(result).toContain("email: string?");
  });

  test("does not contain Parse Warnings when no errors", () => {
    const result = formatCodeContext(FULL_CTX);
    expect(result).not.toContain("### Parse Warnings");
  });
});

describe("formatCodeContext — parse errors", () => {
  test("contains Parse Warnings section when errors present", () => {
    const ctx: CodeContext = { ...EMPTY_CTX, parseErrors: ["/src/bad.ts: Unexpected token"] };
    const result = formatCodeContext(ctx);
    expect(result).toContain("### Parse Warnings");
    expect(result).toContain("/src/bad.ts: Unexpected token");
  });

  test("returns non-empty string even if only parse errors exist", () => {
    const ctx: CodeContext = { ...EMPTY_CTX, parseErrors: ["some error"] };
    const result = formatCodeContext(ctx);
    expect(result).not.toBe("");
  });
});

describe("formatCodeContext — table structure", () => {
  test("class table has correct markdown pipe format", () => {
    const result = formatCodeContext(FULL_CTX);
    expect(result).toContain("| Class | Methods | Properties | Extends |");
    expect(result).toContain("|-------|---------|------------|---------|");
  });

  test("endpoints table has correct headers", () => {
    const result = formatCodeContext(FULL_CTX);
    expect(result).toContain("| Method | Path | Handler | File |");
  });

  test("file paths in tables are shortened to last 2 segments", () => {
    const result = formatCodeContext(FULL_CTX);
    expect(result).toContain("src/user.controller.ts");
  });
});
