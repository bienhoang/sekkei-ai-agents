import { readFile } from 'node:fs/promises'
import { parse as parseYaml } from 'yaml'
import type { ProjectConfig, ChainEntry } from '../types.js'

const CHAIN_DISPLAY_ORDER = [
  'requirements', 'functions-list', 'nfr', 'project-plan',
  'basic-design', 'security-design', 'detail-design',
  'test-plan', 'ut-spec', 'it-spec', 'st-spec', 'uat-spec',
  'sitemap', 'operation-design', 'migration-design',
]

const DEFAULT_CONFIG: ProjectConfig = {
  project: { name: 'Unknown', type: 'web', language: 'ja' },
  output: { directory: 'workspace-docs' },
  chain: {},
}

export async function readConfig(configPath: string): Promise<ProjectConfig> {
  try {
    const raw = await readFile(configPath, 'utf8')
    const parsed = parseYaml(raw) as Partial<ProjectConfig>
    return {
      project: parsed.project ?? DEFAULT_CONFIG.project,
      output: parsed.output ?? DEFAULT_CONFIG.output,
      chain: parsed.chain ?? {},
      rfp: parsed.rfp,
      split_mode: parsed.split_mode,
    }
  } catch {
    return DEFAULT_CONFIG
  }
}

export function getChainEntries(config: ProjectConfig): ChainEntry[] {
  const entries: ChainEntry[] = []
  const chain = config.chain ?? {}

  for (const docType of CHAIN_DISPLAY_ORDER) {
    const entry = chain[docType]
    if (entry) {
      entries.push({
        docType,
        status: entry.status ?? 'pending',
        lifecycle: entry.lifecycle ?? null,
        version: entry.version ?? null,
        output: entry.output ?? null,
        lastModified: entry.last_updated ?? null,
      })
    }
  }

  // Add any remaining doc types not in display order
  for (const [docType, entry] of Object.entries(chain)) {
    if (!CHAIN_DISPLAY_ORDER.includes(docType)) {
      entries.push({
        docType,
        status: entry.status ?? 'pending',
        lifecycle: entry.lifecycle ?? null,
        version: entry.version ?? null,
        output: entry.output ?? null,
        lastModified: entry.last_updated ?? null,
      })
    }
  }

  return entries
}

export function getChainStats(entries: ChainEntry[]) {
  const total = entries.length
  const completed = entries.filter(e => e.status === 'complete').length
  const inProgress = entries.filter(e => e.status === 'in-progress').length
  const pending = entries.filter(e => e.status === 'pending').length
  const completionPct = total > 0 ? Math.round((completed / total) * 100) : 0
  return { total, completed, inProgress, pending, completionPct }
}
