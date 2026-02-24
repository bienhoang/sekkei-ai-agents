import { parseArgs } from 'node:util'
import { createServer } from 'node:http'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import getPort from 'get-port'
import open from 'open'
import { createApp } from './app.js'
import { resolveDocsDir, resolveGuideDir } from './utils/resolve-docs-dir.js'

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
Usage: sekkei-preview [options]

Options:
  --docs <path>   Docs directory (auto-resolve if omitted)
  --guide         Serve bundled user guide (readonly)
  --port <N>      Port (default: 4983, auto if busy)
  --no-open       Do not open browser
  --help          Show this help

`)
}

async function main(): Promise<void> {
  const { values } = parseArgs({
    args: process.argv.slice(2),
    options: {
      docs:      { type: 'string' },
      guide:     { type: 'boolean', default: false },
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

  const guideMode = values.guide as boolean
  const noOpen = values['no-open'] as boolean
  const preferredPort = values.port ? parseInt(values.port as string, 10) : 4983

  if (isNaN(preferredPort) || preferredPort < 1 || preferredPort > 65535) {
    process.stderr.write('Error: --port must be between 1 and 65535\n')
    process.exit(1)
  }

  let docsRoot: string
  let mode: 'workspace' | 'guide'

  try {
    if (guideMode) {
      docsRoot = resolveGuideDir(packageDir)
      mode = 'guide'
    } else {
      docsRoot = resolveDocsDir(values.docs as string | undefined)
      mode = 'workspace'
    }
  } catch (err) {
    process.stderr.write(`Error: ${(err as Error).message}\n`)
    process.exit(1)
  }

  const port = await getPort({ port: preferredPort })
  const version = getVersion()
  const app = createApp({ docsRoot, version, mode })
  const server = createServer(app)

  server.listen(port, '127.0.0.1', () => {
    const url = `http://localhost:${port}`
    process.stderr.write(`sekkei-preview ${version} — ${mode} mode\n`)
    process.stderr.write(`Docs: ${docsRoot}\n`)
    process.stderr.write(`Listening: ${url}\n`)
    if (!noOpen) {
      open(url).catch(() => { /* ignore open errors */ })
    }
  })

  const shutdown = (): void => {
    server.close(() => process.exit(0))
  }
  process.on('SIGINT', shutdown)
  process.on('SIGTERM', shutdown)
}

main().catch(err => {
  process.stderr.write(`Fatal: ${(err as Error).message}\n`)
  process.exit(1)
})
