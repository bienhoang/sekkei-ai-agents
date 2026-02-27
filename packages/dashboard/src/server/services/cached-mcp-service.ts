import type { DashboardMcpClient } from './mcp-client.js'

interface CacheEntry<T> {
  data: T
  expiry: number
}

const MAX_ENTRIES = 100

const DEFAULT_TTL: Record<string, number> = {
  validate_chain: 60_000,
  validate_document: 300_000,
  chain_status: 120_000,
}

export class CachedMcpService {
  private cache = new Map<string, CacheEntry<unknown>>()

  constructor(private client: DashboardMcpClient) {}

  private cacheKey(name: string, args: Record<string, unknown>): string {
    const sorted = Object.keys(args).sort().reduce((acc, k) => {
      acc[k] = args[k]
      return acc
    }, {} as Record<string, unknown>)
    return `${name}:${JSON.stringify(sorted)}`
  }

  async callTool<T>(name: string, args: Record<string, unknown>, ttl?: number): Promise<T | null> {
    const key = this.cacheKey(name, args)
    const cached = this.cache.get(key) as CacheEntry<T> | undefined
    if (cached && cached.expiry > Date.now()) return cached.data

    const raw = await this.client.callTool(name, args)
    if (raw === null) return cached?.data as T ?? null

    try {
      const data = JSON.parse(raw) as T
      if (this.cache.size >= MAX_ENTRIES) {
        const firstKey = this.cache.keys().next().value
        if (firstKey) this.cache.delete(firstKey)
      }
      this.cache.set(key, { data, expiry: Date.now() + (ttl ?? DEFAULT_TTL[name] ?? 60_000) })
      return data
    } catch {
      return cached?.data as T ?? null
    }
  }

  invalidate(name?: string): void {
    if (!name) {
      this.cache.clear()
      return
    }
    for (const key of this.cache.keys()) {
      if (key.startsWith(`${name}:`)) this.cache.delete(key)
    }
  }

  isConnected(): boolean {
    return this.client.isConnected()
  }
}
