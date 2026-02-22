/**
 * Playwright-based screenshot engine for wireframe mockups.
 * Renders HTML strings (from mockup-html-builder) to PNG files.
 */

import { mkdir } from "node:fs/promises";
import { join, dirname } from "node:path";
import { parseScreenLayouts } from "./mockup-parser.js";
import { buildMockupHtml } from "./mockup-html-builder.js";
import { SekkeiError } from "./errors.js";

const VIEWPORTS: Record<string, { width: number; height: number }> = {
  desktop: { width: 1024, height: 768 },
  tablet: { width: 768, height: 1024 },
  mobile: { width: 375, height: 812 },
};

/** Check if playwright is available (installed with chromium) */
export async function isPlaywrightAvailable(): Promise<boolean> {
  try {
    await import("playwright");
    return true;
  } catch {
    return false;
  }
}

/**
 * Render an HTML string to a PNG file using Playwright.
 * Launches browser lazily; caller manages browser lifecycle via returned handle.
 */
export async function renderMockupPng(
  html: string,
  viewport: string,
  outputPath: string,
): Promise<void> {
  let playwright: typeof import("playwright");
  try {
    playwright = await import("playwright");
  } catch {
    throw new SekkeiError("MOCKUP_ERROR", "Playwright not installed. Run: npx playwright install chromium");
  }

  const vp = VIEWPORTS[viewport] ?? VIEWPORTS.desktop;
  let browser;
  try {
    browser = await playwright.chromium.launch({ headless: true });
    const page = await browser.newPage({
      viewport: vp,
      deviceScaleFactor: 2,
    });

    await page.setContent(html, { waitUntil: "domcontentloaded", timeout: 30_000 });

    await mkdir(dirname(outputPath), { recursive: true });
    await page.screenshot({ path: outputPath, fullPage: true, type: "png" });
    await page.close();
  } catch (err) {
    if (err instanceof SekkeiError) throw err;
    throw new SekkeiError("MOCKUP_ERROR", `Screenshot failed: ${(err as Error).message}`);
  } finally {
    await browser?.close();
  }
}

/**
 * High-level orchestrator: parse markdown → render all screens → return PNG paths.
 * Launches browser once and reuses for all screens.
 */
export async function renderScreenDesign(
  markdown: string,
  outputDir: string,
): Promise<string[]> {
  const layouts = parseScreenLayouts(markdown);
  if (layouts.length === 0) return [];

  let playwright: typeof import("playwright");
  try {
    playwright = await import("playwright");
  } catch {
    process.stderr.write("[sekkei] Playwright not available, skipping mockup rendering\n");
    return [];
  }

  const imagesDir = join(outputDir, "images");
  await mkdir(imagesDir, { recursive: true });

  const paths: string[] = [];
  let browser;
  try {
    browser = await playwright.chromium.launch({ headless: true });

    for (let i = 0; i < layouts.length; i++) {
      const layout = layouts[i];
      const html = buildMockupHtml(layout);
      const filename = layout.screen_id ? `${layout.screen_id}.png` : `screen-${i + 1}.png`;
      const outputPath = join(imagesDir, filename);
      const vp = VIEWPORTS[layout.viewport] ?? VIEWPORTS.desktop;

      const page = await browser.newPage({
        viewport: vp,
        deviceScaleFactor: 2,
      });

      try {
        await page.setContent(html, { waitUntil: "domcontentloaded", timeout: 30_000 });
        await page.screenshot({ path: outputPath, fullPage: true, type: "png" });
        paths.push(`images/${filename}`);
        process.stderr.write(`[sekkei] Rendered mockup: ${filename}\n`);
      } finally {
        await page.close();
      }
    }
  } catch (err) {
    if (err instanceof SekkeiError) throw err;
    throw new SekkeiError("MOCKUP_ERROR", `Batch rendering failed: ${(err as Error).message}`);
  } finally {
    await browser?.close();
  }

  return paths;
}
