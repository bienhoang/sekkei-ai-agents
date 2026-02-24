import { existsSync, readFileSync } from 'node:fs';
import { resolve, join, dirname } from 'node:path';
import { parse as parseYaml } from 'yaml';

/**
 * Resolve docs directory with priority:
 * 1. --docs CLI flag
 * 2. ./sekkei-docs/ in CWD
 * 3. sekkei.config.yaml → output.directory
 * 4. Error
 */
export function resolveDocsDir(cliDocsFlag?: string): string {
  const cwd = process.cwd();

  // Priority 1: CLI flag
  if (cliDocsFlag) {
    const abs = resolve(cwd, cliDocsFlag);
    if (!existsSync(abs)) {
      throw new Error(`Docs directory not found: ${abs}`);
    }
    return abs;
  }

  // Priority 2: ./sekkei-docs/ convention
  const conventionDir = join(cwd, 'sekkei-docs');
  if (existsSync(conventionDir)) {
    return conventionDir;
  }

  // Priority 3: sekkei.config.yaml
  const configPath = join(cwd, 'sekkei.config.yaml');
  if (existsSync(configPath)) {
    try {
      const raw = readFileSync(configPath, 'utf8');
      const config = parseYaml(raw) as { output?: { directory?: string } };
      const outputDir = config?.output?.directory;
      if (outputDir) {
        const abs = resolve(cwd, outputDir);
        if (existsSync(abs)) {
          return abs;
        }
      }
    } catch {
      // Config parse failed — fall through
    }
  }

  throw new Error(
    'No docs directory found. Use --docs <path>, create ./sekkei-docs/, or set output.directory in sekkei.config.yaml'
  );
}

/**
 * Resolve user-guide directory for --guide mode:
 * 1. <packageDir>/guide/          → bundled in published package
 * 2. Walk up from packageDir to find docs/user-guide/  → monorepo dev
 * 3. Error
 */
export function resolveGuideDir(packageDir: string): string {
  // Priority 1: Bundled guide/ in published package
  const bundled = join(packageDir, 'guide');
  if (existsSync(bundled)) return bundled;

  // Priority 2: Walk up from packageDir to find docs/user-guide/
  let current = packageDir;
  for (let i = 0; i < 5; i++) {
    const candidate = join(current, 'docs', 'user-guide');
    if (existsSync(candidate)) return candidate;
    const parent = dirname(current);
    if (parent === current) break;
    current = parent;
  }

  throw new Error(
    'User guide not found. Expected <package>/guide/ or docs/user-guide/ in a parent directory.'
  );
}
