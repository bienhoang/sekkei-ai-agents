import { Router } from 'express'
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { existsSync } from 'node:fs'
import type { ServiceContext, QualityMetricsBundle } from '../types.js'
import { getChainEntries } from '../services/config-reader.js'
import { ID_PATTERN, TEST_DOC_TYPES, CHAIN_ORDER, computeStaleness } from '../lib/chain-helpers.js'

const NFR_ID_PATTERN = /\bNFR-\d{1,4}\b/g

const DESIGN_DOC_TYPES = new Set(['basic-design', 'detail-design', 'security-design'])

const NFR_CATEGORIES = [
  { pattern: /可用性/, category: '可用性', categoryEn: 'Availability' },
  { pattern: /性能[・\s]*拡張性/, category: '性能・拡張性', categoryEn: 'Performance/Scalability' },
  { pattern: /運用[・\s]*保守性/, category: '運用・保守性', categoryEn: 'Operability/Maintainability' },
  { pattern: /移行性/, category: '移行性', categoryEn: 'Migration' },
  { pattern: /セキュリティ/, category: 'セキュリティ', categoryEn: 'Security' },
  { pattern: /システム環境[・\s]*エコロジー|システム環境/, category: 'システム環境・エコロジー', categoryEn: 'System Environment' },
]

export function createQualityMetricsRouter(ctx: ServiceContext): Router {
  const router = Router()

  router.get('/quality-metrics', async (req, res) => {
    if (!ctx.cachedMcp?.isConnected()) {
      return res.status(503).json({ error: 'MCP server not connected' })
    }

    try {
      const refresh = req.query.refresh === 'true'
      if (refresh) {
        ctx.cachedMcp.invalidate('validate_chain')
      }

      const config = await ctx.configReader.readConfig(ctx.configPath)
      const chainEntries = getChainEntries(config)

      // Read all doc files
      const docContents = await readDocContents(ctx.docsRoot, chainEntries)

      // Build traceability matrix
      const matrix = buildTraceabilityMatrix(docContents)

      // Coverage metrics
      const coverage = computeCoverageMetrics(matrix)

      // Health score (simple: based on status)
      const health = computeHealthFromEntries(chainEntries)

      // Staleness
      const stalenessData = computeStaleness(chainEntries)

      // NFR categories from nfr doc
      const nfrEntry = chainEntries.find(e => e.docType === 'nfr')
      const nfrContent = nfrEntry?.output
        ? (docContents.get('nfr') ?? '')
        : ''
      const nfr = classifyNfr(nfrContent, matrix)

      // Risk score
      const nfrAvgCoverage = nfr.length > 0
        ? Math.round(nfr.reduce((s, c) => s + c.coverage, 0) / nfr.length)
        : coverage.overall

      const testEntries = chainEntries.filter(e => TEST_DOC_TYPES.has(e.docType))
      const testCoverage = testEntries.length > 0
        ? Math.round(testEntries.filter(e => e.status === 'complete').length / testEntries.length * 100)
        : 0

      const risk = computeRisk({
        traceCompleteness: coverage.overall,
        nfrCoverage: nfrAvgCoverage,
        testCoverage,
        freshness: stalenessData.overallScore,
        structuralHealth: health.overall,
      })

      const bundle: QualityMetricsBundle = {
        coverage,
        health,
        risk,
        nfr,
        staleness: {
          overallScore: stalenessData.overallScore,
          staleCount: stalenessData.staleCount,
          warnings: stalenessData.warnings,
        },
        timestamp: Date.now(),
      }

      res.json(bundle)
    } catch (err) {
      res.status(500).json({ error: (err as Error).message })
    }
  })

  return router
}

// ── Helpers ──────────────────────────────────────────────────────────────────

async function readDocContents(
  docsRoot: string,
  entries: { docType: string; output: string | null }[]
): Promise<Map<string, string>> {
  const map = new Map<string, string>()
  for (const entry of entries) {
    if (!entry.output) continue
    const filePath = join(docsRoot, entry.output)
    if (!existsSync(filePath)) continue
    try {
      map.set(entry.docType, await readFile(filePath, 'utf8'))
    } catch {
      // skip unreadable
    }
  }
  return map
}

interface TraceEntry {
  id: string
  docType: string
  downstreamRefs: string[]
}

function buildTraceabilityMatrix(docContents: Map<string, string>): TraceEntry[] {
  // Collect all IDs defined per doc type
  const definedByDoc = new Map<string, Set<string>>()
  const referencedByDoc = new Map<string, Set<string>>()

  for (const [docType, content] of docContents) {
    const defined = new Set<string>()
    const referenced = new Set<string>()
    const matches = [...content.matchAll(new RegExp(ID_PATTERN.source, 'g'))]

    for (const match of matches) {
      const id = match[0]
      if (match.index === undefined) continue
      const lineIdx = content.lastIndexOf('\n', match.index) + 1
      const line = content.slice(lineIdx, content.indexOf('\n', match.index))
      const isDef = line.includes('#') || (line.includes('|') && line.indexOf(id) < line.length / 3)
      if (isDef) defined.add(id)
      else referenced.add(id)
    }

    definedByDoc.set(docType, defined)
    referencedByDoc.set(docType, referenced)
  }

  // Build matrix: for each defined ID, find which doc types reference it downstream
  const matrix: TraceEntry[] = []
  for (const [docType, ids] of definedByDoc) {
    for (const id of ids) {
      const downstreamRefs: string[] = []
      for (const [refDocType, refs] of referencedByDoc) {
        if (refDocType !== docType && refs.has(id)) {
          downstreamRefs.push(refDocType)
        }
      }
      matrix.push({ id, docType, downstreamRefs })
    }
  }

  return matrix
}

function computeCoverageMetrics(matrix: TraceEntry[]): QualityMetricsBundle['coverage'] {
  if (matrix.length === 0) {
    return { overall: 0, reqToDesign: 0, reqToTest: 0, fullTrace: 0, byDocType: {} }
  }

  const byDocType: Record<string, { total: number; traced: number; coverage: number }> = {}
  for (const entry of matrix) {
    if (!byDocType[entry.docType]) byDocType[entry.docType] = { total: 0, traced: 0, coverage: 0 }
    byDocType[entry.docType].total += 1
    if (entry.downstreamRefs.length > 0) byDocType[entry.docType].traced += 1
  }
  for (const dt of Object.keys(byDocType)) {
    const g = byDocType[dt]
    g.coverage = g.total > 0 ? Math.round((g.traced / g.total) * 100) : 0
  }

  const total = matrix.length
  const traced = matrix.filter(e => e.downstreamRefs.length > 0).length
  const overall = total > 0 ? Math.round((traced / total) * 100) : 0

  const reqEntries = matrix.filter(e => e.docType === 'requirements')
  const reqTotal = reqEntries.length

  const reqToDesign = reqTotal > 0
    ? Math.round(reqEntries.filter(e => e.downstreamRefs.some(r => DESIGN_DOC_TYPES.has(r))).length / reqTotal * 100)
    : 0
  const reqToTest = reqTotal > 0
    ? Math.round(reqEntries.filter(e => e.downstreamRefs.some(r => TEST_DOC_TYPES.has(r))).length / reqTotal * 100)
    : 0
  const fullTrace = reqTotal > 0
    ? Math.round(
        reqEntries.filter(
          e => e.downstreamRefs.some(r => DESIGN_DOC_TYPES.has(r)) &&
               e.downstreamRefs.some(r => TEST_DOC_TYPES.has(r))
        ).length / reqTotal * 100
      )
    : 0

  return { overall, reqToDesign, reqToTest, fullTrace, byDocType }
}

function computeHealthFromEntries(
  entries: { docType: string; status: string }[]
): QualityMetricsBundle['health'] {
  const perDoc = entries.map(e => {
    const score = e.status === 'complete' ? 100 : e.status === 'in-progress' ? 60 : 20
    const topIssues: string[] = e.status !== 'complete' ? [`${e.docType} is ${e.status}`] : []
    return { docType: e.docType, score, topIssues }
  })
  const overall = perDoc.length > 0
    ? Math.round(perDoc.reduce((s, d) => s + d.score, 0) / perDoc.length)
    : 0
  return { overall, perDoc }
}

function classifyNfr(nfrContent: string, matrix: TraceEntry[]): QualityMetricsBundle['nfr'] {
  if (!nfrContent) return []

  const tracedNfrIds = new Set(
    matrix
      .filter(e => e.docType === 'nfr' && e.downstreamRefs.length > 0)
      .map(e => e.id)
  )

  const lines = nfrContent.split('\n')
  const results: QualityMetricsBundle['nfr'] = []

  for (const catDef of NFR_CATEGORIES) {
    const ids = new Set<string>()
    let inSection = false

    for (const line of lines) {
      const headingMatch = line.match(/^(#{1,6})\s+(.+)$/)
      if (headingMatch) {
        inSection = catDef.pattern.test(headingMatch[2])
      }
      if (inSection) {
        const found = [...line.matchAll(new RegExp(NFR_ID_PATTERN.source, 'g'))]
        for (const m of found) ids.add(m[0])
      }
    }

    const nfrIds = [...ids].sort()
    if (nfrIds.length === 0 && !nfrContent.match(catDef.pattern)) continue

    const traced = nfrIds.filter(id => tracedNfrIds.has(id)).length
    const coverage = nfrIds.length > 0 ? Math.round((traced / nfrIds.length) * 100) : 0

    results.push({ category: catDef.category, categoryEn: catDef.categoryEn, nfrIds, coverage })
  }

  return results
}

function computeRisk(params: {
  traceCompleteness: number
  nfrCoverage: number
  testCoverage: number
  freshness: number
  structuralHealth: number
}): QualityMetricsBundle['risk'] {
  const { traceCompleteness, nfrCoverage, testCoverage, freshness, structuralHealth } = params
  const overall = Math.round(
    0.30 * traceCompleteness +
    0.20 * nfrCoverage +
    0.20 * testCoverage +
    0.15 * freshness +
    0.15 * structuralHealth
  )
  const grade = overall >= 80 ? 'green' : overall >= 60 ? 'yellow' : 'red'
  return { overall, grade, breakdown: params }
}
