#!/usr/bin/env node

import { parseArgs } from 'node:util';
import { spawn } from 'node:child_process';
import { existsSync, lstatSync, rmSync, symlinkSync, unlinkSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { resolveDocsDir, resolveGuideDir } from './resolve-docs-dir.js';
import { generateIndexIfMissing } from './generate-index.js';
import { generateVitePressConfig } from './generate-config.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const packageDir = resolve(__dirname, '..');

function printUsage(): void {
  console.log(`
Usage: sekkei-preview [command] [options]

Commands:
  dev     Start dev server with hot-reload (default)
  build   Build static site
  serve   Serve built static site

Options:
  --docs <path>   Docs directory (default: auto-resolve)
  --guide         Serve user guide instead of spec docs
  --port <N>      Dev server port (default: 5173)
  --edit          Enable WYSIWYG editing mode
  --help          Show this help
`);
}

function main(): void {
  const { values, positionals } = parseArgs({
    args: process.argv.slice(2),
    options: {
      docs: { type: 'string' },
      port: { type: 'string' },
      guide: { type: 'boolean', default: false },
      edit: { type: 'boolean', default: false },
      help: { type: 'boolean', default: false },
    },
    allowPositionals: true,
    strict: false,
  });

  if (values.help) {
    printUsage();
    process.exit(0);
  }

  const command = (positionals[0] as string) ?? 'dev';
  if (!['dev', 'build', 'serve'].includes(command)) {
    console.error(`Unknown command: ${command}`);
    printUsage();
    process.exit(1);
  }

  const port = values.port ? parseInt(values.port as string, 10) : 5173;
  if (isNaN(port) || port < 1 || port > 65535) {
    console.error('Error: --port must be a number between 1 and 65535');
    process.exit(1);
  }
  const edit = values.edit as boolean;
  const guide = values.guide as boolean;

  // Resolve docs directory
  let docsDir: string;
  let title: string | undefined;
  let description: string | undefined;
  try {
    if (guide) {
      if (values.docs) {
        console.error('Warning: --guide takes precedence over --docs');
      }
      docsDir = resolveGuideDir(packageDir);
      title = 'Sekkei User Guide';
      description = 'Hướng dẫn sử dụng Sekkei';
    } else {
      docsDir = resolveDocsDir(values.docs as string | undefined);
    }
  } catch (err) {
    console.error(`Error: ${(err as Error).message}`);
    process.exit(1);
  }

  console.log(`Docs directory: ${docsDir}`);

  // Generate index.md if missing
  generateIndexIfMissing(docsDir);

  // Generate VitePress config
  generateVitePressConfig(docsDir, packageDir, {
    edit,
    port,
    title,
    description,
  });

  console.log(`VitePress config generated at ${docsDir}/.vitepress/config.mts`);

  if (edit) {
    console.log('Edit mode enabled — WYSIWYG editor available');
  }

  // Symlink package's node_modules into docs dir so VitePress can resolve deps
  const pkgNodeModules = resolve(packageDir, 'node_modules');
  const docsNodeModules = join(docsDir, 'node_modules');
  if (!existsSync(docsNodeModules)) {
    symlinkSync(pkgNodeModules, docsNodeModules, 'junction');
  }

  // Cleanup function for dev mode — remove generated artifacts on exit
  function cleanup(): void {
    try {
      if (existsSync(docsNodeModules) && lstatSync(docsNodeModules).isSymbolicLink()) {
        unlinkSync(docsNodeModules);
      }
    } catch { /* best-effort */ }
    try {
      const configPath = join(docsDir, '.vitepress', 'config.mts');
      if (existsSync(configPath)) rmSync(configPath);
    } catch { /* best-effort */ }
    try {
      const themeDir = join(docsDir, '.vitepress', 'theme');
      if (existsSync(themeDir)) rmSync(themeDir, { recursive: true, force: true });
    } catch { /* best-effort */ }
  }

  const env = { ...process.env };
  if (edit) {
    env.SEKKEI_EDIT = '1';
  }

  // Build VitePress args — run from docs dir (no srcDir argument needed)
  const vpArgs: string[] = [command];
  if (command === 'dev') {
    vpArgs.push('--port', String(port));
  }

  // Resolve VitePress binary
  const vitepressBin = resolve(packageDir, 'node_modules', '.bin', 'vitepress');

  // Spawn VitePress process with CWD = docsDir
  const child = spawn(vitepressBin, vpArgs, {
    stdio: 'inherit',
    env,
    cwd: docsDir,
  });

  child.on('error', (err) => {
    console.error(`Failed to start VitePress: ${err.message}`);
    process.exit(1);
  });

  child.on('close', (code) => {
    cleanup();
    process.exit(code ?? 0);
  });

  // Forward SIGINT/SIGTERM to child
  const signals: NodeJS.Signals[] = ['SIGINT', 'SIGTERM'];
  for (const sig of signals) {
    process.on(sig, () => {
      child.kill(sig);
    });
  }
}

main();
