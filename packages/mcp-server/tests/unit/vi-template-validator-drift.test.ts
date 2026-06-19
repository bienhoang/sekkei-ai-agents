import { describe, it, expect } from "@jest/globals";
import { readFile } from "node:fs/promises";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { DOC_TYPES, type DocType } from "../../src/types/documents.js";
import { validateDocument } from "../../src/lib/validator.js";
import { resolveLang } from "../../src/lib/validator-section-maps.js";

/**
 * Drift guard: every templates/vi/<doc>.md must satisfy its own validator
 * section/column rules. A one-character mismatch between a template heading
 * and the validator's expected vi string is a silent validation failure;
 * this test makes that failure loud. Skeleton templates have empty data rows,
 * so only structural checks (sections + column headers) are exercised here.
 */
const __dirname = dirname(fileURLToPath(import.meta.url));
const TEMPLATE_DIR = resolve(__dirname, "../../templates/vi");
const VI = resolveLang("vi");

describe("vi templates ↔ validator (no heading/column drift)", () => {
  for (const docType of DOC_TYPES as readonly DocType[]) {
    it(`${docType}: vi template has no missing sections or columns`, async () => {
      const content = await readFile(resolve(TEMPLATE_DIR, `${docType}.md`), "utf-8");
      const result = validateDocument(content, docType, undefined, { check_completeness: false }, VI);

      const structural = result.issues.filter(
        (i) => i.type === "missing_section" || i.type === "missing_column",
      );
      if (structural.length > 0) {
        throw new Error(
          `${docType} structural drift:\n` + structural.map((i) => `  - ${i.message}`).join("\n"),
        );
      }
      expect(structural).toHaveLength(0);
    });
  }
});
