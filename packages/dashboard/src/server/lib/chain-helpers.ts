import type { StalenessData } from '../types.js'

// ── Shared constants ─────────────────────────────────────────────────────────

export const CHAIN_ORDER = [
  'requirements', 'functions-list', 'nfr', 'project-plan',
  'basic-design', 'security-design', 'detail-design',
  'test-plan', 'ut-spec', 'it-spec', 'st-spec', 'uat-spec',
] as const

export const TEST_DOC_TYPES = new Set(['ut-spec', 'it-spec', 'st-spec', 'uat-spec', 'test-plan'])

// Cross-reference ID pattern (shared between analytics and quality-metrics)
export const ID_PATTERN = /\b(F|REQ|NFR|SCR|TBL|API|CLS|UT|IT|ST|UAT)-\d{1,4}\b/g

// ── Shared computation ───────────────────────────────────────────────────────

export function computeStaleness(
  entries: { docType: string; lastModified: string | null; status: string }[]
): StalenessData {
  const warnings: StalenessData['warnings'] = []
  let staleCount = 0
  const entryMap = new Map(entries.map(e => [e.docType, e]))

  for (let i = 1; i < CHAIN_ORDER.length; i++) {
    const downstream = entryMap.get(CHAIN_ORDER[i])
    if (!downstream?.lastModified || downstream.status === 'pending') continue

    for (let j = i - 1; j >= 0; j--) {
      const upstream = entryMap.get(CHAIN_ORDER[j])
      if (!upstream?.lastModified) continue

      if (new Date(upstream.lastModified).getTime() > new Date(downstream.lastModified).getTime()) {
        staleCount++
        warnings.push({
          upstream: CHAIN_ORDER[j],
          downstream: CHAIN_ORDER[i],
          message: `${CHAIN_ORDER[i]} may be outdated (upstream ${CHAIN_ORDER[j]} was modified later)`,
        })
      }
      break
    }
  }

  return {
    overallScore: entries.length > 0 ? Math.round((1 - staleCount / entries.length) * 100) : 100,
    staleCount,
    totalDocs: entries.length,
    entries: [],
    warnings,
  }
}
