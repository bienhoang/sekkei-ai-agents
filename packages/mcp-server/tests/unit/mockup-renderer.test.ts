import { describe, it, expect } from "@jest/globals";
import { existsSync, statSync, rmSync } from "node:fs";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { buildMockupHtml, circledNumber, parseSlashItems, firstChar, parsePageCount } from "../../src/lib/mockup-html-builder.js";
import { isPlaywrightAvailable, renderMockupPng } from "../../src/lib/mockup-renderer.js";
import type { ScreenLayout } from "../../src/lib/mockup-schema.js";

const SAMPLE_LAYOUT: ScreenLayout = {
  layout_type: "form",
  viewport: "desktop",
  regions: {
    header: {
      components: [
        { n: 1, type: "logo", label: "ロゴ" },
      ],
    },
    main: {
      components: [
        { n: 2, type: "text-input", label: "メールアドレス", required: true },
        { n: 3, type: "password-input", label: "パスワード", required: true },
        { n: 4, type: "button", label: "ログイン", variant: "primary" },
      ],
    },
    footer: {
      components: [
        { n: 5, type: "text", label: "© 2026 Company" },
      ],
    },
  },
};

describe("circledNumber", () => {
  it("returns plain Latin digits for all numbers", () => {
    expect(circledNumber(1)).toBe("1");
    expect(circledNumber(2)).toBe("2");
    expect(circledNumber(10)).toBe("10");
    expect(circledNumber(20)).toBe("20");
    expect(circledNumber(21)).toBe("21");
    expect(circledNumber(99)).toBe("99");
  });
});

describe("buildMockupHtml", () => {
  const html = buildMockupHtml(SAMPLE_LAYOUT);

  it("returns valid HTML document", () => {
    expect(html).toContain("<!DOCTYPE html>");
    expect(html).toContain("</html>");
  });

  it("embeds Noto Sans JP font (no CDN link)", () => {
    expect(html).not.toContain("fonts.googleapis.com");
    expect(html).toContain("Noto Sans JP");
  });

  it("includes annotation CSS class", () => {
    expect(html).toContain(".annotation");
  });

  it("includes component labels from input", () => {
    expect(html).toContain("メールアドレス");
    expect(html).toContain("パスワード");
    expect(html).toContain("ログイン");
    expect(html).toContain("ロゴ");
  });

  it("includes annotation numbers as plain digits", () => {
    expect(html).toContain(">1<");
    expect(html).toContain(">2<");
    expect(html).toContain(">3<");
  });

  it("includes required mark for required fields", () => {
    expect(html).toContain("※");
  });

  it("sets viewport width CSS variable", () => {
    expect(html).toContain("--viewport-width: 1024px");
  });
});

describe("parseSlashItems", () => {
  it("splits on slash separator", () => expect(parseSlashItems("A / B / C")).toEqual(["A", "B", "C"]));
  it("handles single item (no slash)", () => expect(parseSlashItems("Home")).toEqual(["Home"]));
  it("filters empty segments", () => expect(parseSlashItems(" / ")).toEqual([]));
});

describe("firstChar", () => {
  it("returns first character", () => expect(firstChar("Admin")).toBe("A"));
  it("returns ? for empty string", () => expect(firstChar("")).toBe("?"));
  it("handles leading space", () => expect(firstChar("  X")).toBe("X"));
});

describe("parsePageCount", () => {
  it("returns array of page numbers", () => expect(parsePageCount("5")).toEqual(["1", "2", "3", "4", "5"]));
  it("defaults to 3 for non-numeric", () => expect(parsePageCount("abc")).toEqual(["1", "2", "3"]));
  it("clamps to 10 max", () => expect(parsePageCount("99")).toHaveLength(10));
  it("clamps to 1 min", () => expect(parsePageCount("-5")).toEqual(["1"]));
});

describe("layout HTML output", () => {
  const BASE_REGIONS = {
    header: { components: [{ n: 1, type: "logo" as const, label: "App" }] },
    main: { components: [{ n: 2, type: "text" as const, label: "Content" }] },
    footer: { components: [{ n: 3, type: "text" as const, label: "Footer" }] },
  };

  it("form layout: wraps main in form-container", () => {
    const html = buildMockupHtml({ layout_type: "form", viewport: "desktop", regions: BASE_REGIONS });
    expect(html).toContain("form-container");
  });

  it("dashboard layout: uses dashboard-grid", () => {
    const html = buildMockupHtml({ layout_type: "dashboard", viewport: "desktop", regions: BASE_REGIONS });
    expect(html).toContain("dashboard-grid");
  });

  it("list layout: no form-container in body", () => {
    const html = buildMockupHtml({ layout_type: "list", viewport: "desktop", regions: BASE_REGIONS });
    const body = html.split("</style>")[1] || "";
    expect(body).not.toContain("form-container");
  });

  it("detail layout: uses detail-grid", () => {
    const html = buildMockupHtml({ layout_type: "detail", viewport: "desktop", regions: BASE_REGIONS });
    expect(html).toContain("detail-grid");
  });

  it("modal layout: uses modal-backdrop", () => {
    const html = buildMockupHtml({ layout_type: "modal", viewport: "desktop", regions: BASE_REGIONS });
    expect(html).toContain("modal-backdrop");
    expect(html).toContain("modal-box");
  });

  it("wizard layout: uses stepper", () => {
    const html = buildMockupHtml({
      layout_type: "wizard",
      viewport: "desktop",
      regions: {
        steps: { components: [{ n: 1, type: "text" as const, label: "Step 1", active: true }] },
        main: { components: [{ n: 2, type: "text-input" as const, label: "Name", required: true }] },
      },
    });
    expect(html).toContain("stepper");
    expect(html).toContain("step-content");
  });

  it("all layouts: no fonts.googleapis.com CDN link", () => {
    for (const layout_type of ["form", "dashboard", "list", "detail", "modal", "wizard"] as const) {
      const html = buildMockupHtml({ layout_type, viewport: "desktop", regions: BASE_REGIONS });
      expect(html).not.toContain("fonts.googleapis.com");
    }
  });
});

describe("component rendering fixes", () => {
  function makeLayout(type: string, label: string, n = 1) {
    return buildMockupHtml({
      layout_type: "form",
      viewport: "desktop",
      regions: { main: { components: [{ n, type: type as any, label }] } },
    });
  }

  it("tabs: renders multiple tab items from slash-separated label", () => {
    const html = makeLayout("tabs", "Tab1 / Tab2 / Tab3");
    expect(html).toContain("tab-item active");
    expect(html).toContain("Tab2");
    expect(html).toContain("Tab3");
  });

  it("breadcrumb: renders multiple segments", () => {
    const html = makeLayout("breadcrumb", "Home / Settings / Profile");
    expect(html).toContain("Home");
    expect(html).toContain("Settings");
    expect(html).toContain("Profile");
  });

  it("avatar: shows first character of label", () => {
    const html = makeLayout("avatar", "Admin");
    expect(html).toContain(">A<");
  });

  it("pagination: renders page numbers from label", () => {
    const html = makeLayout("pagination", "4");
    expect(html).toContain(">1<");
    expect(html).toContain(">4<");
  });

  it("chart-placeholder: uses chart-placeholder class", () => {
    const html = makeLayout("chart-placeholder", "Sales Chart");
    expect(html).toContain("chart-placeholder");
  });

  it("sidebar: renders vertical nav items", () => {
    const html = makeLayout("sidebar", "Dashboard / Users / Settings");
    expect(html).toContain("sidebar-item active");
    expect(html).toContain("Users");
    expect(html).toContain("Settings");
  });

  it("width: applies w-sm class on component wrapper", () => {
    const html = buildMockupHtml({
      layout_type: "form",
      viewport: "desktop",
      regions: { main: { components: [{ n: 1, type: "button" as const, label: "OK", width: "sm" as const }] } },
    });
    expect(html).toContain("w-sm");
  });
});

describe("Playwright renderer", () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = await mkdtemp(join(tmpdir(), "sekkei-test-"));
  });

  afterEach(() => {
    if (existsSync(tmpDir)) rmSync(tmpDir, { recursive: true });
  });

  it("renders PNG file from HTML (requires Playwright)", async () => {
    const available = await isPlaywrightAvailable();
    if (!available) {
      console.warn("Playwright not installed — skipping render test");
      return;
    }
    const html = buildMockupHtml(SAMPLE_LAYOUT);
    const outPath = join(tmpDir, "test.png");
    await renderMockupPng(html, "desktop", outPath);
    expect(existsSync(outPath)).toBe(true);
    const stats = statSync(outPath);
    expect(stats.size).toBeGreaterThan(1000);
  }, 60_000);
});
