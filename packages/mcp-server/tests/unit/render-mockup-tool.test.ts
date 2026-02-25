import { describe, it, expect, beforeAll, afterAll } from "@jest/globals";
import { resolve, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { mkdtemp, rm, writeFile, readFile, mkdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerRenderMockupTool, handleRenderMockup } from "../../src/tools/render-mockup.js";
import { isPlaywrightAvailable } from "../../src/lib/mockup-renderer.js";
import { extractAllLayoutYamls } from "../../src/lib/mockup-parser.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const TEMPLATE_DIR = resolve(__dirname, "../../templates");

async function callTool(
  server: McpServer,
  name: string,
  args: Record<string, unknown>,
): Promise<{ content: Array<{ type: string; text: string }>; isError?: boolean }> {
  return await (server as any)._registeredTools[name].handler(args, {});
}

const MARKDOWN_WITH_YAML = `# 画面設計

## 1. 画面レイアウト — ログイン画面 (SCR-001)

\`\`\`yaml
layout_type: form
viewport: desktop
screen_id: SCR-001
regions:
  header:
    components:
      - {n: 1, type: logo, label: "ロゴ"}
  main:
    style: centered-form
    components:
      - {n: 2, type: text-input, label: "メールアドレス", required: true}
      - {n: 3, type: password-input, label: "パスワード", required: true}
      - {n: 4, type: button, label: "ログイン", variant: primary}
  footer:
    components:
      - {n: 5, type: text, label: "© 2026 Company"}
\`\`\`
`;

const MARKDOWN_NO_YAML = `# 基本設計書

## 5. 画面設計

### 5.1 画面一覧

| 画面ID | 画面名 |
|--------|--------|
| SCR-001 | ログイン画面 |
`;

describe("render_screen_mockup tool registration", () => {
  let server: McpServer;

  beforeAll(() => {
    server = new McpServer({ name: "test", version: "0.0.1" });
    registerRenderMockupTool(server);
  });

  it("registers on the server", () => {
    expect((server as any)._registeredTools["render_screen_mockup"]).toBeDefined();
  });
});

describe("handleRenderMockup", () => {
  let tmpDir: string;

  beforeAll(async () => {
    tmpDir = await mkdtemp(join(tmpdir(), "sekkei-render-test-"));
  });

  afterAll(async () => {
    try { await rm(tmpDir, { recursive: true }); } catch { /* ignore */ }
  });

  it("returns error when neither content nor markdown_path provided", async () => {
    const result = await handleRenderMockup({ output_dir: tmpDir });
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain("MOCKUP_ERROR");
    expect(result.content[0].text).toContain("Either markdown_path or content is required");
  });

  it("returns error when markdown_path does not exist", async () => {
    const result = await handleRenderMockup({
      markdown_path: join(tmpDir, "nonexistent.md"),
      output_dir: tmpDir,
    });
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain("Failed to read file");
  });

  it("returns no_layouts for markdown without YAML blocks", async () => {
    const available = await isPlaywrightAvailable();
    if (!available) {
      // Without Playwright, we get "skipped" instead — still valid
      const result = await handleRenderMockup({ content: MARKDOWN_NO_YAML, output_dir: tmpDir });
      expect(result.isError).toBeUndefined();
      const data = JSON.parse(result.content[0].text);
      expect(data.status).toBe("skipped");
      expect(data.rendered_paths).toEqual([]);
      return;
    }

    const result = await handleRenderMockup({ content: MARKDOWN_NO_YAML, output_dir: tmpDir });
    expect(result.isError).toBeUndefined();
    const data = JSON.parse(result.content[0].text);
    expect(data.status).toBe("no_layouts");
    expect(data.rendered_paths).toEqual([]);
    expect(data.count).toBe(0);
  });

  it("reads from markdown_path when provided", async () => {
    const filePath = join(tmpDir, "test-input.md");
    await writeFile(filePath, MARKDOWN_NO_YAML, "utf-8");

    const available = await isPlaywrightAvailable();
    if (!available) {
      const result = await handleRenderMockup({ markdown_path: filePath, output_dir: tmpDir });
      expect(result.isError).toBeUndefined();
      const data = JSON.parse(result.content[0].text);
      expect(data.status).toBe("skipped");
      return;
    }

    const result = await handleRenderMockup({ markdown_path: filePath, output_dir: tmpDir });
    expect(result.isError).toBeUndefined();
    const data = JSON.parse(result.content[0].text);
    expect(data.status).toBe("no_layouts");
  });

  it("renders PNGs from content with YAML blocks (requires Playwright)", async () => {
    const available = await isPlaywrightAvailable();
    if (!available) {
      const result = await handleRenderMockup({ content: MARKDOWN_WITH_YAML, output_dir: tmpDir });
      expect(result.isError).toBeUndefined();
      const data = JSON.parse(result.content[0].text);
      expect(data.status).toBe("skipped");
      expect(data.reason).toContain("Playwright");
      return;
    }

    const renderDir = join(tmpDir, "render-output");
    await mkdir(renderDir, { recursive: true });
    const result = await handleRenderMockup({ content: MARKDOWN_WITH_YAML, output_dir: renderDir });
    expect(result.isError).toBeUndefined();
    const data = JSON.parse(result.content[0].text);
    expect(data.status).toBe("rendered");
    expect(data.count).toBeGreaterThan(0);
    expect(data.rendered_paths.length).toBeGreaterThan(0);
    expect(data.rendered_paths[0]).toContain("images/");
  }, 60_000);
});

describe("render_screen_mockup via MCP server", () => {
  let server: McpServer;

  beforeAll(() => {
    server = new McpServer({ name: "test", version: "0.0.1" });
    registerRenderMockupTool(server);
  });

  it("returns error via tool call when no input provided", async () => {
    const result = await callTool(server, "render_screen_mockup", {
      output_dir: "/tmp/test-render",
    });
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain("MOCKUP_ERROR");
  });
});

describe("YAML layout block wrapping after render", () => {
  let tmpDir: string;

  beforeAll(async () => {
    tmpDir = await mkdtemp(join(tmpdir(), "sekkei-yaml-wrap-test-"));
  });

  afterAll(async () => {
    try { await rm(tmpDir, { recursive: true }); } catch { /* ignore */ }
  });

  it("returns modified_content with data-yaml-layout when content is provided and rendered", async () => {
    const available = await isPlaywrightAvailable();
    if (!available) {
      console.warn("Playwright not installed — skipping YAML wrapping test");
      return;
    }

    const wrapDir = join(tmpDir, "wrap-content");
    await mkdir(wrapDir, { recursive: true });
    const result = await handleRenderMockup({ content: MARKDOWN_WITH_YAML, output_dir: wrapDir });

    expect(result.isError).toBeFalsy();
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.status).toBe("rendered");
    expect(parsed.modified_content).toBeDefined();
    expect(parsed.modified_content).toContain("data-yaml-layout");
    expect(parsed.modified_content).toContain("<details data-yaml-layout>");
    expect(parsed.modified_content).toContain("</details>");
  }, 60_000);

  it("writes modified markdown to file and wraps YAML when markdown_path is provided", async () => {
    const available = await isPlaywrightAvailable();
    if (!available) {
      console.warn("Playwright not installed — skipping file write test");
      return;
    }

    const wrapDir = join(tmpDir, "wrap-file");
    await mkdir(wrapDir, { recursive: true });
    const mdPath = join(wrapDir, "screen-design.md");
    await writeFile(mdPath, MARKDOWN_WITH_YAML, "utf-8");

    const result = await handleRenderMockup({ markdown_path: mdPath, output_dir: wrapDir });

    expect(result.isError).toBeFalsy();
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.status).toBe("rendered");

    const written = await readFile(mdPath, "utf-8");
    expect(written).toContain("data-yaml-layout");
    expect(written).toContain("<details data-yaml-layout>");
    expect(written).toContain("</details>");
  }, 60_000);

  it("does not include modified_content when status is no_layouts", async () => {
    const available = await isPlaywrightAvailable();
    if (!available) {
      console.warn("Playwright not installed — skipping no_layouts test");
      return;
    }

    const result = await handleRenderMockup({
      content: MARKDOWN_NO_YAML,
      output_dir: tmpDir,
    });

    expect(result.isError).toBeFalsy();
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.status).toBe("no_layouts");
    expect(parsed.modified_content).toBeUndefined();
  }, 60_000);
});

describe("extractAllLayoutYamls — details format support", () => {
  const DETAILS_MD = `# 画面設計書 — ログイン画面 (SCR-AUTH-001)

## 1. 画面レイアウト — ログイン

<details data-yaml-layout>
<summary>YAML Layout Source</summary>

\`\`\`yaml
layout_type: form
viewport: desktop
regions:
  main:
    components:
      - {n: 1, type: text-input, label: メールアドレス, required: true}
\`\`\`

</details>

## 2. 画面項目定義
`;

  it("extracts YAML from <details data-yaml-layout> blocks", () => {
    const yamls = extractAllLayoutYamls(DETAILS_MD);
    expect(yamls).toHaveLength(1);
    expect(yamls[0]).toContain("layout_type: form");
    expect(yamls[0]).toContain("text-input");
  });

  it("extracts YAML from both code fence and details blocks preserving order", () => {
    const fenceMd = `# 画面設計書

## 1. 画面レイアウト — 画面A

\`\`\`yaml
layout_type: form
viewport: desktop
regions:
  main:
    components:
      - {n: 1, type: button, label: A, variant: primary}
\`\`\`

# 画面設計書 — 画面B

## 1. 画面レイアウト — 画面B

<details data-yaml-layout>
<summary>YAML Layout Source</summary>

\`\`\`yaml
layout_type: list
viewport: mobile
regions:
  main:
    components:
      - {n: 1, type: button, label: B, variant: secondary}
\`\`\`

</details>
`;
    const yamls = extractAllLayoutYamls(fenceMd);
    expect(yamls).toHaveLength(2);
    expect(yamls[0]).toContain("desktop");
    expect(yamls[1]).toContain("mobile");
  });

  it("returns empty array when no layout blocks present", () => {
    expect(extractAllLayoutYamls("# No layouts here")).toEqual([]);
  });

  it("extracts details blocks even without ## 1. heading (data-yaml-layout is sufficient)", () => {
    const md = "# Title\n\n<details data-yaml-layout>\n<summary>YAML Layout Source</summary>\n\n```yaml\nlayout_type: form\nregions: {}\n```\n\n</details>\n";
    const yamls = extractAllLayoutYamls(md);
    expect(yamls).toHaveLength(1);
    expect(yamls[0]).toContain("layout_type: form");
  });
});
