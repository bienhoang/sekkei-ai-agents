import { describe, it, expect } from "@jest/globals";
import { resolveOutputPath } from "../../src/lib/resolve-output-path.js";

describe("resolveOutputPath", () => {
  it("returns 01-overview.md for overview", () => {
    expect(resolveOutputPath("overview")).toBe("01-overview.md");
  });

  it("returns 02-requirements.md for requirements", () => {
    expect(resolveOutputPath("requirements")).toBe("02-requirements.md");
  });

  it("returns 04-functions-list.md for functions-list", () => {
    expect(resolveOutputPath("functions-list")).toBe("04-functions-list.md");
  });

  it("returns 03-system/ for basic-design shared", () => {
    expect(resolveOutputPath("basic-design", "shared")).toBe("03-system/");
  });

  it("returns 05-features/{name}/basic-design.md for basic-design feature", () => {
    expect(resolveOutputPath("basic-design", "feature", "sales-management"))
      .toBe("05-features/sales-management/basic-design.md");
  });

  it("returns 05-features/{name}/detail-design.md for detail-design feature", () => {
    expect(resolveOutputPath("detail-design", "feature", "user-management"))
      .toBe("05-features/user-management/detail-design.md");
  });

  it("returns undefined for detail-design without scope", () => {
    expect(resolveOutputPath("detail-design")).toBeUndefined();
  });

  it("returns 08-test/ for test-spec shared", () => {
    expect(resolveOutputPath("test-spec", "shared")).toBe("08-test/");
  });

  it("returns 05-features/{name}/test-spec.md for test-spec feature", () => {
    expect(resolveOutputPath("test-spec", "feature", "sales-management"))
      .toBe("05-features/sales-management/test-spec.md");
  });

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

  it("returns undefined for basic-design feature without feature name", () => {
    expect(resolveOutputPath("basic-design", "feature")).toBeUndefined();
  });
});
