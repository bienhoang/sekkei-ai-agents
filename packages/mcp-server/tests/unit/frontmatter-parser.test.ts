/**
 * Unit tests for frontmatter-parser.ts
 */
import { describe, it, expect } from "@jest/globals";
import { parseFrontmatter } from "../../src/lib/frontmatter-parser.js";

describe("parseFrontmatter", () => {
  it("parses valid YAML frontmatter", () => {
    const content = `---
version: "1.0"
date: "2026-01-01"
status: "published"
---
# Document Body

Content here.`;

    const result = parseFrontmatter(content);

    expect(result.meta).toEqual({
      version: "1.0",
      date: "2026-01-01",
      status: "published",
    });
    expect(result.body).toBe("# Document Body\n\nContent here.");
  });

  it("returns empty meta when no frontmatter present", () => {
    const content = `# Document Title

This is just content without frontmatter.`;

    const result = parseFrontmatter(content);

    expect(result.meta).toEqual({});
    expect(result.body).toBe(content);
  });

  it("returns empty meta on malformed YAML in frontmatter", () => {
    const content = `---
invalid: [unclosed
---
# Body

Content.`;

    const result = parseFrontmatter(content);

    expect(result.meta).toEqual({});
    expect(result.body).toBe("# Body\n\nContent.");
  });

  it("preserves body content after frontmatter", () => {
    const content = `---
key: value
---
## Section 1

Text with special chars: !@#$%^&*()

## Section 2

More content.`;

    const result = parseFrontmatter(content);

    expect(result.meta).toEqual({ key: "value" });
    expect(result.body).toContain("## Section 1");
    expect(result.body).toContain("special chars");
    expect(result.body).toContain("## Section 2");
  });

  it("handles frontmatter with version, date, status fields", () => {
    const content = `---
version: "2.1"
date: "2026-03-02"
status: "draft"
author: "Test Author"
---
Content goes here.`;

    const result = parseFrontmatter(content);

    expect(result.meta.version).toBe("2.1");
    expect(result.meta.date).toBe("2026-03-02");
    expect(result.meta.status).toBe("draft");
    expect(result.meta.author).toBe("Test Author");
  });
});
