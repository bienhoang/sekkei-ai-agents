import { existsSync, readFileSync } from 'node:fs';
import { resolve, join } from 'node:path';
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
