// Shared client-side types — import from here instead of defining locally in pages

export interface QualityMetricsBundle {
  coverage: {
    overall: number
    reqToDesign: number
    reqToTest: number
    fullTrace: number
    byDocType: Record<string, { total: number; traced: number; coverage: number }>
  }
  health: {
    overall: number
    perDoc: { docType: string; score: number; topIssues: string[] }[]
  }
  risk: {
    overall: number
    grade: 'green' | 'yellow' | 'red'
    breakdown: {
      traceCompleteness: number
      nfrCoverage: number
      testCoverage: number
      freshness: number
      structuralHealth: number
    }
  }
  nfr: {
    category: string
    categoryEn: string
    nfrIds: string[]
    coverage: number
  }[]
  staleness: { overallScore: number; staleCount: number; warnings: unknown[] }
  timestamp: number
}

export interface SnapshotMetrics {
  timestamp: string
  tag: string
  risk: { overall: number; grade: string }
  health: { overall: number }
  coverage: { overall: number; reqToDesign: number; reqToTest: number; fullTrace: number }
  staleness: { overallScore: number; staleCount: number }
}
