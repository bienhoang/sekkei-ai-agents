import { describe, it, expect } from "@jest/globals";
import { resolveOutputPath } from "../../src/lib/resolve-output-path.js";

describe("resolveOutputPath", () => {
  // Requirements phase
  it("returns 02-requirements/requirements.md for requirements", () => {
    expect(resolveOutputPath("requirements")).toBe("02-requirements/requirements.md");
  });

  it("returns 02-requirements/nfr.md for nfr", () => {
    expect(resolveOutputPath("nfr")).toBe("02-requirements/nfr.md");
  });

  it("returns 02-requirements/project-plan.md for project-plan", () => {
    expect(resolveOutputPath("project-plan")).toBe("02-requirements/project-plan.md");
  });

  it("returns 04-functions-list/functions-list.md for functions-list", () => {
    expect(resolveOutputPath("functions-list")).toBe("04-functions-list/functions-list.md");
  });

  // Design phase
  it("returns 03-system/ for basic-design shared", () => {
    expect(resolveOutputPath("basic-design", "shared")).toBe("03-system/");
  });

  it("returns 05-features/{name}/basic-design.md for basic-design feature", () => {
    expect(resolveOutputPath("basic-design", "feature", "sales-management"))
      .toBe("05-features/sales-management/basic-design.md");
  });

  it("returns 03-system/security-design.md for security-design", () => {
    expect(resolveOutputPath("security-design")).toBe("03-system/security-design.md");
  });

  it("returns 05-features/{name}/detail-design.md for detail-design feature", () => {
    expect(resolveOutputPath("detail-design", "feature", "user-management"))
      .toBe("05-features/user-management/detail-design.md");
  });

  it("returns 03-system/detail-design.md for detail-design monolithic", () => {
    expect(resolveOutputPath("detail-design")).toBe("03-system/detail-design.md");
  });

  // Test phase
  it("returns 08-test/test-plan.md for test-plan", () => {
    expect(resolveOutputPath("test-plan")).toBe("08-test/test-plan.md");
  });

  it("returns 08-test/ut-spec.md for ut-spec without scope", () => {
    expect(resolveOutputPath("ut-spec")).toBe("08-test/ut-spec.md");
  });

  it("returns 05-features/{name}/ut-spec.md for ut-spec feature", () => {
    expect(resolveOutputPath("ut-spec", "feature", "sales-management"))
      .toBe("05-features/sales-management/ut-spec.md");
  });

  it("returns 08-test/it-spec.md for it-spec without scope", () => {
    expect(resolveOutputPath("it-spec")).toBe("08-test/it-spec.md");
  });

  it("returns 08-test/st-spec.md for st-spec", () => {
    expect(resolveOutputPath("st-spec")).toBe("08-test/st-spec.md");
  });

  it("returns 08-test/uat-spec.md for uat-spec", () => {
    expect(resolveOutputPath("uat-spec")).toBe("08-test/uat-spec.md");
  });

  // Supplementary
  it("returns 06-data/ for migration-design", () => {
    expect(resolveOutputPath("migration-design")).toBe("06-data/");
  });

  it("returns 07-operations/ for operation-design", () => {
    expect(resolveOutputPath("operation-design")).toBe("07-operations/");
  });

  it("returns 03-system/crud-matrix.md for crud-matrix", () => {
    expect(resolveOutputPath("crud-matrix")).toBe("03-system/crud-matrix.md");
  });

  it("returns 08-test/traceability-matrix.md for traceability-matrix", () => {
    expect(resolveOutputPath("traceability-matrix")).toBe("08-test/traceability-matrix.md");
  });

  it("returns 03-system/basic-design.md for basic-design monolithic (no scope)", () => {
    expect(resolveOutputPath("basic-design")).toBe("03-system/basic-design.md");
  });

  it("returns monolithic default for basic-design feature without feature name", () => {
    expect(resolveOutputPath("basic-design", "feature")).toBe("03-system/basic-design.md");
  });
});
