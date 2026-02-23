#!/usr/bin/env node

/**
 * npx sekkei init — Interactive project setup wizard.
 */

import * as p from "@clack/prompts";
import { stringify } from "yaml";
import { existsSync, writeFileSync } from "node:fs";
import { execFileSync, execSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runEditorSetup } from "./setup.js";

const CONFIG_FILE = "sekkei.config.yaml";

// Resolve paths relative to this bin script
const __init_dirname = dirname(fileURLToPath(import.meta.url));
const MCP_DIR = resolve(__init_dirname, "..");
const PYTHON_DIR = resolve(MCP_DIR, "python");
const DIST_DIR = resolve(MCP_DIR, "dist");

// Parse flags
const skipDeps = process.argv.includes("--skip-deps");

// Parse --preset flag
const presetArg = process.argv.find((a) => a.startsWith("--preset"));
const presetValue = presetArg?.includes("=")
  ? presetArg.split("=")[1]
  : process.argv[process.argv.indexOf("--preset") + 1];

async function main() {
  p.intro("Sekkei セットアップ");

  // Check existing config
  if (existsSync(CONFIG_FILE)) {
    const overwrite = await p.confirm({
      message: `${CONFIG_FILE} は既に存在します。上書きしますか？`,
      initialValue: false,
    });
    if (p.isCancel(overwrite) || !overwrite) {
      p.cancel("セットアップを中止しました");
      process.exit(0);
    }
  }

  const project = await p.group({
    name: () =>
      p.text({
        message: "プロジェクト名",
        placeholder: "my-project",
        validate: (v) => (!v ? "プロジェクト名を入力してください" : undefined),
      }),
    type: () =>
      p.select({
        message: "プロジェクト種別",
        options: [
          { value: "web", label: "Web アプリケーション" },
          { value: "mobile", label: "モバイルアプリ" },
          { value: "api", label: "API / バックエンド" },
          { value: "desktop", label: "デスクトップアプリ" },
          { value: "lp", label: "ランディングページ" },
          { value: "internal-system", label: "社内システム" },
          { value: "saas", label: "SaaS" },
          { value: "batch", label: "バッチ処理" },
        ],
      }),
    stack: () =>
      p.multiselect({
        message: "技術スタック（複数選択可）",
        options: [
          { value: "react", label: "React" },
          { value: "vue", label: "Vue.js" },
          { value: "nextjs", label: "Next.js" },
          { value: "nodejs", label: "Node.js" },
          { value: "python", label: "Python" },
          { value: "java", label: "Java" },
          { value: "go", label: "Go" },
          { value: "ruby", label: "Ruby" },
          { value: "postgresql", label: "PostgreSQL" },
          { value: "mysql", label: "MySQL" },
          { value: "mongodb", label: "MongoDB" },
        ],
        required: false,
      }),
    language: () =>
      p.select({
        message: "ドキュメント言語",
        options: [
          { value: "ja", label: "日本語" },
          { value: "en", label: "English" },
          { value: "vi", label: "Tiếng Việt" },
        ],
      }),
    keigo: () =>
      p.select({
        message: "敬語レベル",
        options: [
          { value: "丁寧語", label: "丁寧語（ですます調）" },
          { value: "謙譲語", label: "謙譲語（謙遜語）" },
          { value: "simple", label: "常体（である調）" },
        ],
      }),
    preset: () => {
      // Skip interactive prompt if --preset flag provided with valid value
      if (presetValue && ["enterprise", "standard", "agile"].includes(presetValue)) {
        return Promise.resolve(presetValue);
      }
      return p.select({
        message: "テンプレートプリセット",
        options: [
          { value: "enterprise", label: "大手SI / 官公庁向け（Enterprise）" },
          { value: "standard", label: "中堅SI / SES向け（Standard）" },
          { value: "agile", label: "アジャイル / スタートアップ（Agile）" },
        ],
      });
    },
    outputDir: () =>
      p.text({
        message: "出力ディレクトリ",
        placeholder: "./output",
        initialValue: "./output",
      }),
  });

  // Check for cancellation
  if (p.isCancel(project)) {
    p.cancel("セットアップを中止しました");
    process.exit(0);
  }

  // Validate output dir (no path traversal)
  const outDir = String(project.outputDir || "./output");
  if (outDir.includes("..")) {
    p.cancel("出力ディレクトリに '..' は使用できません");
    process.exit(1);
  }

  // Build config
  const config = {
    project: {
      name: project.name,
      type: project.type,
      stack: project.stack || [],
      language: project.language,
      keigo: project.keigo,
      preset: project.preset,
    },
    output: {
      directory: outDir,
      engine: "node",
    },
    chain: {
      rfp: "",
      overview: { status: "pending" },
      functions_list: { status: "pending" },
      requirements: { status: "pending" },
      basic_design: { status: "pending" },
      detail_design: { status: "pending" },
      test_spec: { status: "pending" },
    },
  };

  // Write YAML
  const yamlContent = stringify(config);
  writeFileSync(CONFIG_FILE, yamlContent, "utf-8");
  p.log.success(`${CONFIG_FILE} を生成しました`);

  // Editor setup
  const s = p.spinner();
  s.start("エディタ設定を検出中...");
  try {
    await runEditorSetup();
    s.stop("エディタ設定完了");
  } catch {
    s.stop("エディタ設定をスキップしました");
  }

  // Auto-install dependencies (unless --skip-deps)
  if (skipDeps) {
    p.note(
      [
        "PDF出力を利用する場合:",
        "  npx playwright install chromium",
        "",
        "Python拡張機能（用語集・差分）を利用する場合:",
        "  pip install -r python/requirements.txt",
      ].join("\n"),
      "セットアップ後の手順"
    );
  } else {
    const ds = p.spinner();

    // a. Python venv
    ds.start("Python venv をセットアップ中...");
    try {
      const pythonCmd = (() => {
        try { execSync("python3 --version", { stdio: "pipe" }); return "python3"; } catch { /* empty */ }
        try { execSync("python --version", { stdio: "pipe" }); return "python"; } catch { /* empty */ }
        return null;
      })();
      if (pythonCmd) {
        const venvDir = resolve(PYTHON_DIR, ".venv");
        if (!existsSync(venvDir)) {
          execFileSync(pythonCmd, ["-m", "venv", venvDir], { stdio: "pipe" });
        }
        const reqFile = resolve(PYTHON_DIR, "requirements.txt");
        if (existsSync(reqFile)) {
          execFileSync(resolve(venvDir, "bin", "pip"), ["install", "-q", "-r", reqFile], { stdio: "pipe", timeout: 120000 });
        }
        ds.stop("Python venv セットアップ完了");
      } else {
        ds.stop("Python が見つかりません — エクスポート機能は利用不可");
      }
    } catch {
      ds.stop("Python venv セットアップ失敗（スキップ）");
    }

    // b. Playwright chromium
    ds.start("Playwright chromium をインストール中...");
    try {
      execSync("npx playwright install chromium", { cwd: MCP_DIR, stdio: "pipe", timeout: 180000 });
      ds.stop("Playwright chromium インストール完了");
    } catch {
      ds.stop("Playwright インストール失敗 — PDF出力は利用不可");
    }

    // c. npm build (if dist/ missing)
    if (!existsSync(resolve(DIST_DIR, "index.js"))) {
      ds.start("MCP server をビルド中...");
      try {
        execSync("npm run build", { cwd: MCP_DIR, stdio: "pipe", timeout: 60000 });
        ds.stop("ビルド完了");
      } catch {
        ds.stop("ビルド失敗 — 手動で npm run build を実行してください");
      }
    }

    // d. Health check summary
    try {
      const { checkHealth, formatHealthReport } = await import("../dist/cli/commands/health-check.js");
      const report = await checkHealth();
      p.note(formatHealthReport(report), "環境ステータス");
    } catch {
      // health-check module may not be built yet — skip gracefully
    }
  }

  p.outro("設定完了！");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
