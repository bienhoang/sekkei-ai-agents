/**
 * Font manager — downloads Noto Sans JP fonts on first use, caches in ~/.cache/sekkei/fonts/.
 */
import { existsSync, mkdirSync } from "node:fs";
import { writeFile } from "node:fs/promises";
import { join } from "node:path";
import { homedir } from "node:os";
import { logger } from "./logger.js";

const CACHE_DIR = join(homedir(), ".cache", "sekkei", "fonts");
const FONT_FILES = {
  regular: "NotoSansJP-Regular.ttf",
  bold: "NotoSansJP-Bold.ttf",
};

// Google Fonts CDN URLs for Noto Sans JP
const FONT_URLS: Record<string, string> = {
  regular: "https://github.com/google/fonts/raw/main/ofl/notosansjp/NotoSansJP-Regular.ttf",
  bold: "https://github.com/google/fonts/raw/main/ofl/notosansjp/NotoSansJP-Bold.ttf",
};

export interface FontPaths {
  regular: string;
  bold: string;
}

export async function ensureFonts(): Promise<FontPaths> {
  if (!existsSync(CACHE_DIR)) {
    mkdirSync(CACHE_DIR, { recursive: true });
  }

  const paths: FontPaths = {
    regular: join(CACHE_DIR, FONT_FILES.regular),
    bold: join(CACHE_DIR, FONT_FILES.bold),
  };

  for (const [weight, url] of Object.entries(FONT_URLS)) {
    const filePath = paths[weight as keyof FontPaths];
    if (!existsSync(filePath)) {
      logger.info({ font: weight }, "Downloading Noto Sans JP font...");
      const res = await fetch(url);
      if (!res.ok) throw new Error(`Failed to download font: ${res.statusText}`);
      const buffer = Buffer.from(await res.arrayBuffer());
      if (buffer.length < 10_000) {
        throw new Error(`Font download too small (${buffer.length} bytes) — likely corrupted`);
      }
      await writeFile(filePath, buffer);
      logger.info({ font: weight, path: filePath, size: buffer.length }, "Font downloaded");
    }
  }

  return paths;
}
