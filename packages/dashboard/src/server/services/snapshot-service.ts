import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import type { SnapshotMetrics } from '../types.js'

const execFileAsync = promisify(execFile)
const TAG_PREFIX = 'sekkei-snapshot-'

export class SnapshotService {
  constructor(private repoRoot: string) {}

  async create(metrics: Omit<SnapshotMetrics, 'tag'>): Promise<string> {
    const ts = new Date().toISOString().replace(/:/g, '-').slice(0, 16)
    const tag = `${TAG_PREFIX}${ts}`
    await execFileAsync('git', ['tag', '-a', tag, '-m', JSON.stringify(metrics)], { cwd: this.repoRoot })
    return tag
  }

  async list(limit = 50): Promise<SnapshotMetrics[]> {
    try {
      const { stdout } = await execFileAsync('git', [
        'tag', '-l', `${TAG_PREFIX}*`,
        '--sort=-creatordate',
        '--format=%(refname:short)\t%(contents)',
      ], { cwd: this.repoRoot, maxBuffer: 1024 * 1024 })

      return stdout.trim().split('\n')
        .filter(Boolean)
        .slice(0, limit)
        .map(line => {
          const tabIdx = line.indexOf('\t')
          const tag = line.slice(0, tabIdx)
          const json = line.slice(tabIdx + 1)
          try {
            return { ...JSON.parse(json), tag } as SnapshotMetrics
          } catch {
            return null
          }
        })
        .filter(Boolean) as SnapshotMetrics[]
    } catch {
      return []
    }
  }
}
