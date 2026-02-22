import { describe, it, expect } from "@jest/globals";
import { ScreenLayoutSchema } from "../../src/lib/mockup-schema.js";
import {
  extractLayoutYaml,
  extractAllLayoutYamls,
  parseScreenLayout,
  parseScreenLayouts,
} from "../../src/lib/mockup-parser.js";

const VALID_LAYOUT = {
  layout_type: "form",
  viewport: "desktop",
  regions: {
    main: {
      style: "centered-form",
      components: [
        { n: 1, type: "text-input", label: "メールアドレス", required: true },
        { n: 2, type: "password-input", label: "パスワード", required: true },
        { n: 3, type: "button", label: "ログイン", variant: "primary" },
      ],
    },
  },
};

const VALID_MARKDOWN = `# 画面設計書 — ログイン画面 (SCR-AUTH-001)

## 1. 画面レイアウト

\`\`\`yaml
layout_type: form
viewport: desktop
regions:
  main:
    style: centered-form
    components:
      - {n: 1, type: text-input, label: メールアドレス, required: true}
      - {n: 2, type: password-input, label: パスワード, required: true}
      - {n: 3, type: button, label: ログイン, variant: primary}
\`\`\`

## 2. 画面項目定義
| # | 項目ID | 項目名 |
`;

describe("ScreenLayoutSchema", () => {
  it("validates a correct form layout", () => {
    const result = ScreenLayoutSchema.safeParse(VALID_LAYOUT);
    expect(result.success).toBe(true);
  });

  it("defaults viewport to desktop", () => {
    const { viewport, ...rest } = VALID_LAYOUT;
    const result = ScreenLayoutSchema.safeParse(rest);
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.viewport).toBe("desktop");
  });

  it("rejects missing layout_type", () => {
    const { layout_type, ...rest } = VALID_LAYOUT;
    const result = ScreenLayoutSchema.safeParse(rest);
    expect(result.success).toBe(false);
  });

  it("rejects invalid component type", () => {
    const bad = {
      ...VALID_LAYOUT,
      regions: {
        main: {
          components: [{ n: 1, type: "nonexistent-widget", label: "test" }],
        },
      },
    };
    const result = ScreenLayoutSchema.safeParse(bad);
    expect(result.success).toBe(false);
  });

  it("rejects duplicate n values", () => {
    const bad = {
      ...VALID_LAYOUT,
      regions: {
        main: {
          components: [
            { n: 1, type: "text-input", label: "A" },
            { n: 1, type: "text-input", label: "B" },
          ],
        },
      },
    };
    const result = ScreenLayoutSchema.safeParse(bad);
    expect(result.success).toBe(false);
  });

  it("rejects n=0 and negative n", () => {
    for (const n of [0, -1]) {
      const bad = {
        ...VALID_LAYOUT,
        regions: { main: { components: [{ n, type: "text-input", label: "X" }] } },
      };
      const result = ScreenLayoutSchema.safeParse(bad);
      expect(result.success).toBe(false);
    }
  });

  it("rejects non-integer n", () => {
    const bad = {
      ...VALID_LAYOUT,
      regions: { main: { components: [{ n: 1.5, type: "text-input", label: "X" }] } },
    };
    const result = ScreenLayoutSchema.safeParse(bad);
    expect(result.success).toBe(false);
  });

  it("accepts unknown region names (record type)", () => {
    const layout = {
      ...VALID_LAYOUT,
      regions: {
        custom_sidebar: { components: [{ n: 1, type: "nav", label: "Menu" }] },
      },
    };
    const result = ScreenLayoutSchema.safeParse(layout);
    expect(result.success).toBe(true);
  });

  it("accepts empty components array", () => {
    const layout = {
      ...VALID_LAYOUT,
      regions: { main: { components: [] } },
    };
    const result = ScreenLayoutSchema.safeParse(layout);
    expect(result.success).toBe(true);
  });
});

describe("extractLayoutYaml", () => {
  it("extracts YAML from valid markdown", () => {
    const yaml = extractLayoutYaml(VALID_MARKDOWN);
    expect(yaml).not.toBeNull();
    expect(yaml).toContain("layout_type: form");
    expect(yaml).toContain("text-input");
  });

  it("returns null when no YAML block", () => {
    const md = "# Title\n\n## 1. 画面レイアウト\n\nSome text without yaml\n";
    expect(extractLayoutYaml(md)).toBeNull();
  });
});

describe("extractAllLayoutYamls", () => {
  it("extracts multiple YAML blocks", () => {
    const multi = VALID_MARKDOWN + "\n\n# 画面設計書 — 登録画面 (SCR-AUTH-002)\n\n" +
      "## 1. 画面レイアウト\n\n```yaml\nlayout_type: form\nviewport: mobile\nregions:\n  main:\n    components:\n      - {n: 1, type: button, label: 登録, variant: primary}\n```\n";
    const results = extractAllLayoutYamls(multi);
    expect(results).toHaveLength(2);
  });
});

describe("parseScreenLayout", () => {
  it("parses valid markdown into ScreenLayout", () => {
    const layout = parseScreenLayout(VALID_MARKDOWN);
    expect(layout.layout_type).toBe("form");
    expect(layout.regions.main.components).toHaveLength(3);
  });

  it("throws on markdown without YAML", () => {
    expect(() => parseScreenLayout("# No layout\n\n## 1. Test\n\nJust text")).toThrow("No YAML layout block found");
  });

  it("throws on malformed YAML", () => {
    const bad = "## 1. 画面レイアウト\n\n```yaml\n  bad: yaml: content: [unclosed\n```\n";
    expect(() => parseScreenLayout(bad)).toThrow("Invalid YAML");
  });
});

describe("parseScreenLayouts", () => {
  it("returns empty array when no YAML blocks found", () => {
    expect(parseScreenLayouts("# No layout here")).toEqual([]);
  });

  it("parses single screen", () => {
    const layouts = parseScreenLayouts(VALID_MARKDOWN);
    expect(layouts).toHaveLength(1);
    expect(layouts[0].layout_type).toBe("form");
  });
});
