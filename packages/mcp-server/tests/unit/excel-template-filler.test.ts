/**
 * Unit tests for excel-template-filler.ts
 *
 * Creates fixture .xlsx files programmatically with ExcelJS, then exercises
 * loadTemplate, fillPlaceholders, fillNamedRanges, saveWorkbook, and fillTemplate.
 */
import { describe, it, expect, beforeAll, afterAll } from "@jest/globals";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import ExcelJS from "exceljs";
import {
  loadTemplate,
  fillPlaceholders,
  fillNamedRanges,
  saveWorkbook,
  fillTemplate,
} from "../../src/lib/excel-template-filler.js";
import { SekkeiError } from "../../src/lib/errors.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

let tmpDir: string;
let fixturePath: string;

/** Build a simple .xlsx fixture with {{PLACEHOLDER}} cells. */
async function buildFixture(destPath: string): Promise<void> {
  const wb = new ExcelJS.Workbook();
  const sheet = wb.addWorksheet("Sheet1");
  sheet.getCell("A1").value = "{{PROJECT_NAME}}";
  sheet.getCell("B1").value = "{{DOC_TYPE}}";
  sheet.getCell("A2").value = "Static content";
  sheet.getCell("B2").value = "{{VERSION}}";
  await wb.xlsx.writeFile(destPath);
}

beforeAll(async () => {
  tmpDir = await mkdtemp(join(tmpdir(), "sekkei-template-test-"));
  fixturePath = join(tmpDir, "fixture.xlsx");
  await buildFixture(fixturePath);
});

afterAll(async () => {
  await rm(tmpDir, { recursive: true, force: true });
});

// ---------------------------------------------------------------------------
// loadTemplate
// ---------------------------------------------------------------------------

describe("loadTemplate", () => {
  it("loads a valid .xlsx file", async () => {
    const wb = await loadTemplate(fixturePath);
    expect(wb).toBeDefined();
    expect(wb.worksheets.length).toBeGreaterThan(0);
  });

  it("rejects path with .. (traversal)", async () => {
    await expect(loadTemplate("../some/path/file.xlsx")).rejects.toThrow(SekkeiError);
    await expect(loadTemplate("../some/path/file.xlsx")).rejects.toMatchObject({
      code: "VALIDATION_FAILED",
    });
  });

  it("rejects non-.xlsx extension", async () => {
    await expect(loadTemplate(join(tmpDir, "doc.csv"))).rejects.toThrow(SekkeiError);
    await expect(loadTemplate(join(tmpDir, "doc.csv"))).rejects.toMatchObject({
      code: "VALIDATION_FAILED",
    });
  });

  it("throws TEMPLATE_NOT_FOUND for missing file", async () => {
    await expect(
      loadTemplate(join(tmpDir, "nonexistent.xlsx"))
    ).rejects.toMatchObject({ code: "TEMPLATE_NOT_FOUND" });
  });
});

// ---------------------------------------------------------------------------
// fillPlaceholders
// ---------------------------------------------------------------------------

describe("fillPlaceholders", () => {
  it("replaces {{PROJECT_NAME}} in cells", async () => {
    const wb = await loadTemplate(fixturePath);
    fillPlaceholders(wb, { PROJECT_NAME: "My Project", DOC_TYPE: "詳細設計書", VERSION: "2.0" });

    const sheet = wb.getWorksheet("Sheet1");
    expect(sheet?.getCell("A1").value).toBe("My Project");
    expect(sheet?.getCell("B1").value).toBe("詳細設計書");
    expect(sheet?.getCell("B2").value).toBe("2.0");
  });

  it("leaves unmatched placeholders intact", async () => {
    const wb = await loadTemplate(fixturePath);
    fillPlaceholders(wb, { PROJECT_NAME: "Filled" }); // no DOC_TYPE key

    const sheet = wb.getWorksheet("Sheet1");
    expect(sheet?.getCell("A1").value).toBe("Filled");
    expect(sheet?.getCell("B1").value).toBe("{{DOC_TYPE}}"); // untouched
  });

  it("does not modify static content", async () => {
    const wb = await loadTemplate(fixturePath);
    fillPlaceholders(wb, { PROJECT_NAME: "X" });

    const sheet = wb.getWorksheet("Sheet1");
    expect(sheet?.getCell("A2").value).toBe("Static content");
  });
});

// ---------------------------------------------------------------------------
// fillNamedRanges
// ---------------------------------------------------------------------------

describe("fillNamedRanges", () => {
  it("is a no-op when workbook has no defined names", async () => {
    const wb = await loadTemplate(fixturePath);
    // Should not throw even without any named ranges
    expect(() => fillNamedRanges(wb, { PROJECT_NAME: "X" })).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// saveWorkbook
// ---------------------------------------------------------------------------

describe("saveWorkbook", () => {
  it("writes a valid file and returns file_path and file_size", async () => {
    const wb = await loadTemplate(fixturePath);
    const outPath = join(tmpDir, "output.xlsx");
    const result = await saveWorkbook(wb, outPath);

    expect(result.file_path).toBe(outPath);
    expect(result.file_size).toBeGreaterThan(0);
  });

  it("rejects output_path with .. traversal", async () => {
    const wb = await loadTemplate(fixturePath);
    await expect(saveWorkbook(wb, "../evil/output.xlsx")).rejects.toThrow(SekkeiError);
  });
});

// ---------------------------------------------------------------------------
// fillTemplate (end-to-end)
// ---------------------------------------------------------------------------

describe("fillTemplate", () => {
  it("fills placeholders and saves file end-to-end", async () => {
    const outPath = join(tmpDir, "filled.xlsx");
    const result = await fillTemplate({
      template_path: fixturePath,
      output_path: outPath,
      data: { PROJECT_NAME: "Sekkei Test", DOC_TYPE: "基本設計書", VERSION: "1.5" },
    });

    expect(result.file_path).toBe(outPath);
    expect(result.file_size).toBeGreaterThan(0);

    // Verify the output file is a valid xlsx by re-loading it
    const verify = new ExcelJS.Workbook();
    await verify.xlsx.readFile(outPath);
    const sheet = verify.getWorksheet("Sheet1");
    expect(sheet?.getCell("A1").value).toBe("Sekkei Test");
    expect(sheet?.getCell("B1").value).toBe("基本設計書");
  });

  it("rejects template_path with .. traversal", async () => {
    await expect(
      fillTemplate({
        template_path: "../bad/template.xlsx",
        output_path: join(tmpDir, "out.xlsx"),
        data: {},
      })
    ).rejects.toMatchObject({ code: "VALIDATION_FAILED" });
  });
});
