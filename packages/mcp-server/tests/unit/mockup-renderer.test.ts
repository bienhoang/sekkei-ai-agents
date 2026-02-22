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
  it("converts 1-20 to circled Unicode characters", () => {
    expect(circledNumber(1)).toBe("①");
    expect(circledNumber(2)).toBe("②");
    expect(circledNumber(10)).toBe("⑩");
    expect(circledNumber(20)).toBe("⑳");
  });

  it("returns plain digits for n > 20", () => {
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

  it("includes circled number characters", () => {
    expect(html).toContain("①");
    expect(html).toContain("②");
    expect(html).toContain("③");
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
