import { describe, it, expect } from "@jest/globals";
import { existsSync, statSync, rmSync } from "node:fs";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { buildMockupHtml, circledNumber } from "../../src/lib/mockup-html-builder.js";
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
      style: "centered-form",
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

  it("includes Google Fonts link for Noto Sans JP", () => {
    expect(html).toContain("fonts.googleapis.com");
    expect(html).toContain("Noto+Sans+JP");
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
