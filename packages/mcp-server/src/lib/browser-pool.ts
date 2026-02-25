/**
 * Singleton browser pool for Playwright Chromium.
 * Keeps the browser alive between exports and closes after 5 min of idle.
 * Eliminates per-export Chromium cold start (1–3s).
 */
import { chromium, Browser } from "playwright";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { logger } from "./logger.js";

const execFileAsync = promisify(execFile);
const IDLE_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes

class BrowserPool {
  private browser: Browser | null = null;
  private idleTimer: NodeJS.Timeout | null = null;
  private refCount = 0;

  async acquire(): Promise<Browser> {
    this.clearIdleTimer();
    this.refCount++;
    if (!this.browser || !this.browser.isConnected()) {
      logger.debug("browser-pool: launching Chromium");
      try {
        this.browser = await chromium.launch({ headless: true });
      } catch {
        // Attempt auto-install fallback
        logger.warn("browser-pool: Chromium not found, attempting install");
        await execFileAsync("npx", ["playwright", "install", "chromium"]);
        this.browser = await chromium.launch({ headless: true });
      }
    }
    return this.browser;
  }

  release(): void {
    this.refCount = Math.max(0, this.refCount - 1);
    if (this.refCount === 0) {
      this.scheduleIdle();
    }
  }

  private scheduleIdle(): void {
    this.clearIdleTimer();
    this.idleTimer = setTimeout(async () => {
      logger.debug("browser-pool: closing idle Chromium");
      await this.close();
    }, IDLE_TIMEOUT_MS);
    // Don't keep the process alive just for the idle timer
    if (this.idleTimer.unref) this.idleTimer.unref();
  }

  private clearIdleTimer(): void {
    if (this.idleTimer) {
      clearTimeout(this.idleTimer);
      this.idleTimer = null;
    }
  }

  async close(): Promise<void> {
    this.clearIdleTimer();
    this.refCount = 0;
    if (this.browser) {
      await this.browser.close().catch(() => {});
      this.browser = null;
    }
  }
}

export const browserPool = new BrowserPool();

// Graceful shutdown — prevent orphaned Chromium processes
process.on("SIGTERM", () => { void browserPool.close(); });
process.on("SIGINT", () => { void browserPool.close(); });
