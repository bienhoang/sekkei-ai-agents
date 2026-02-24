import { existsSync, readFileSync } from 'node:fs'
import { resolve, join, dirname } from 'node:path'
import { parse as parseYaml } from 'yaml'

/**
 * Resolve docs directory with priority:
 * 1. --docs CLI flag
 * 2. ./workspace-docs/ in CWD (or legacy ./sekkei-docs/)
 * 3. sekkei.config.yaml → output.directory
 * 4. Error
 */
export function resolveDocsDir(cliDocsFlag?: string): string {
  const cwd = process.cwd()

  if (cliDocsFlag) {
    const abs = resolve(cwd, cliDocsFlag)
    if (!existsSync(abs)) {
      throw new Error(`Docs directory not found: ${abs}`)
    }
    return abs
  }

  const conventionDir = join(cwd, 'workspace-docs')
  if (existsSync(conventionDir)) {
    return conventionDir
  }
  const legacyDir = join(cwd, 'sekkei-docs')
  if (existsSync(legacyDir)) {
    return legacyDir
  }

  const configPath = join(cwd, 'sekkei.config.yaml')
  if (existsSync(configPath)) {
    try {
      const raw = readFileSync(configPath, 'utf8')
      const config = parseYaml(raw) as { output?: { directory?: string } }
      const outputDir = config?.output?.directory
      if (outputDir) {
        const abs = resolve(cwd, outputDir)
        if (existsSync(abs)) {
          return abs
        }
      }
    } catch {
      // Config parse failed — fall through
    }
  }

  throw new Error(
    'No docs directory found. Use --docs <path>, create ./workspace-docs/, or set output.directory in sekkei.config.yaml'
  )
}

/**
 * Resolve user-guide directory for --guide mode:
 * 1. <packageDir>/guide/          → bundled in published package
 * 2. Walk up from packageDir to find docs/user-guide/  → monorepo dev
 * 3. Error
 */
export function resolveGuideDir(packageDir: string): string {
  const bundled = join(packageDir, 'guide')
  if (existsSync(bundled)) return bundled

  let current = packageDir
  for (let i = 0; i < 5; i++) {
    const candidate = join(current, 'docs', 'user-guide')
    if (existsSync(candidate)) return candidate
    const parent = dirname(current)
    if (parent === current) break
    current = parent
  }

  throw new Error(
    'User guide not found. Expected <package>/guide/ or docs/user-guide/ in a parent directory.'
  )
}
