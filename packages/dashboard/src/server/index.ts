import { parseArgs } from 'node:util'
import { createServer } from 'node:http'
import { readFileSync, existsSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { parse as parseYaml } from 'yaml'
import getPort from 'get-port'
import open from 'open'
import { createApp } from './app.js'
import { DashboardMcpClient } from './services/mcp-client.js'
import { CachedMcpService } from './services/cached-mcp-service.js'
import * as configReader from './services/config-reader.js'
import * as workspaceScanner from './services/workspace-scanner.js'
import * as changelogParser from './services/changelog-parser.js'
import type { ServiceContext } from './types.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const packageDir = join(__dirname, '..')

function getVersion(): string {
  try {
    const pkg = JSON.parse(readFileSync(join(packageDir, 'package.json'), 'utf8'))
    return (pkg as { version?: string }).version ?? '0.0.0'
  } catch {
    return '0.0.0'
  }
}

function printHelp(): void {
  process.stdout.write(`
Usage: sekkei-dashboard [options]

Options:
  --docs <path>   Workspace-docs directory (auto-resolve if omitted)
  --port <N>      Port (default: 4984, auto if busy)
  --no-open       Do not open browser
  --help          Show this help

`)
}

function resolveDocsDir(docsArg?: string): { docsRoot: string; configPath: string } {
  // 1. Explicit --docs flag
  if (docsArg) {
    const docsRoot = resolve(docsArg)
    if (!existsSync(docsRoot)) {
      throw new Error(`Docs directory not found: ${docsRoot}`)
    }
    // Look for config in parent or CWD
    const configPath = findConfigPath(docsRoot)
    return { docsRoot, configPath }
  }

  // 2. Check ./workspace-docs/ in CWD
  const cwdDocs = resolve('workspace-docs')
  if (existsSync(cwdDocs)) {
    const configPath = findConfigPath(cwdDocs)
    return { docsRoot: cwdDocs, configPath }
  }

  // 3. Check sekkei.config.yaml in CWD
  const configInCwd = resolve('sekkei.config.yaml')
  if (existsSync(configInCwd)) {
    try {
      const raw = readFileSync(configInCwd, 'utf8')
      const parsed = parseYaml(raw) as { output?: { directory?: string } }
      const outDir = parsed?.output?.directory ?? 'workspace-docs'
      const docsRoot = resolve(outDir)
      return { docsRoot, configPath: configInCwd }
    } catch {
      // Fall through to error
    }
  }

  throw new Error('No sekkei.config.yaml found. Run `sekkei init` first.')
}

function findConfigPath(docsRoot: string): string {
  const candidates = [
    join(docsRoot, '..', 'sekkei.config.yaml'),
    join(docsRoot, 'sekkei.config.yaml'),
    resolve('sekkei.config.yaml'),
  ]
  for (const path of candidates) {
    if (existsSync(path)) return path
  }
  throw new Error('No sekkei.config.yaml found. Run `sekkei init` first.')
}

async function main(): Promise<void> {
  const { values } = parseArgs({
    args: process.argv.slice(2),
    options: {
      docs:      { type: 'string' },
      port:      { type: 'string' },
      'no-open': { type: 'boolean', default: false },
      help:      { type: 'boolean', default: false },
    },
    strict: false,
  })

  if (values.help) {
    printHelp()
    process.exit(0)
  }

  const noOpen = values['no-open'] as boolean
  const preferredPort = values.port ? parseInt(values.port as string, 10) : 4984

  if (isNaN(preferredPort) || preferredPort < 1 || preferredPort > 65535) {
    process.stderr.write('Error: --port must be between 1 and 65535\n')
    process.exit(1)
  }

  let docsRoot: string
  let configPath: string
  try {
    const resolved = resolveDocsDir(values.docs as string | undefined)
    docsRoot = resolved.docsRoot
    configPath = resolved.configPath
  } catch (err) {
    process.stderr.write(`Error: ${(err as Error).message}\n`)
    process.exit(1)
  }

  // MCP client (optional — graceful fallback)
  const mcpClient = new DashboardMcpClient()
  try {
    await mcpClient.connect()
  } catch {
    process.stderr.write('Warning: MCP client unavailable, using filesystem-only data\n')
  }

  const cachedMcp = new CachedMcpService(mcpClient)

  const services: ServiceContext = {
    docsRoot,
    configPath,
    configReader,
    workspaceScanner,
    changelogParser,
    mcpClient,
    cachedMcp,
  }

  const port = await getPort({ port: preferredPort })
  const version = getVersion()
  const app = createApp({ docsRoot, configPath, version, services })
  const server = createServer(app)

  server.listen(port, '127.0.0.1', () => {
    const url = `http://localhost:${port}`
    process.stderr.write(`sekkei-dashboard ${version}\n`)
    process.stderr.write(`Docs: ${docsRoot}\n`)
    process.stderr.write(`Config: ${configPath}\n`)
    process.stderr.write(`Listening: ${url}\n`)
    if (!noOpen) {
      open(url).catch(() => { /* ignore open errors */ })
    }
  })

  const shutdown = (): void => {
    mcpClient.disconnect().finally(() => {
      server.close(() => process.exit(0))
    })
  }
  process.on('SIGINT', shutdown)
  process.on('SIGTERM', shutdown)
}

main().catch(err => {
  process.stderr.write(`Fatal: ${(err as Error).message}\n`)
  process.exit(1)
})
