import { describe, it, expect } from "@jest/globals";
import { generateBackfillSuggestions } from "../../src/lib/cr-backfill.js";

describe("generateBackfillSuggestions", () => {
  it("detects new F-xxx IDs needing functions-list entry", () => {
    const oldContent = "This section references F-001.";
    const newContent = "This section references F-001 and F-012.";
    const upstream = new Map([
      ["functions-list", "| F-001 | Login | ... |"],
    ]);

    const suggestions = generateBackfillSuggestions("basic-design", oldContent, newContent, upstream);
    expect(suggestions).toHaveLength(1);
    expect(suggestions[0].id).toBe("F-012");
    expect(suggestions[0].target_doc).toBe("functions-list");
    expect(suggestions[0].action).toBe("add");
  });

  it("detects new REQ-xxx IDs needing requirements entry", () => {
    const oldContent = "";
    const newContent = "Implements REQ-005 and REQ-010.";
    const upstream = new Map([
      ["requirements", "| REQ-005 | User auth |"],
    ]);

    const suggestions = generateBackfillSuggestions("basic-design", oldContent, newContent, upstream);
    // REQ-005 exists upstream, REQ-010 does not
    expect(suggestions).toHaveLength(1);
    expect(suggestions[0].id).toBe("REQ-010");
    expect(suggestions[0].target_doc).toBe("requirements");
  });

  it("returns empty for no new IDs", () => {
    const content = "References F-001 only.";
    const upstream = new Map([
      ["functions-list", "| F-001 | Login |"],
    ]);

    const suggestions = generateBackfillSuggestions("basic-design", content, content, upstream);
    expect(suggestions).toHaveLength(0);
  });

  it("ignores IDs that already exist upstream", () => {
    const oldContent = "";
    const newContent = "Uses F-001 and F-002.";
    const upstream = new Map([
      ["functions-list", "| F-001 | Login | F-002 | Register |"],
    ]);

    const suggestions = generateBackfillSuggestions("basic-design", oldContent, newContent, upstream);
    expect(suggestions).toHaveLength(0);
  });

  it("ignores IDs belonging to the origin doc itself", () => {
    const oldContent = "";
    const newContent = "Defines SCR-001 and references F-001.";
    const upstream = new Map([
      ["functions-list", "| F-001 | Login |"],
    ]);

    // SCR belongs to basic-design (origin), so it shouldn't be suggested
    const suggestions = generateBackfillSuggestions("basic-design", oldContent, newContent, upstream);
    expect(suggestions).toHaveLength(0);
  });
});
