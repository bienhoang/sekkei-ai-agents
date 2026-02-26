// ── Constants ──

export const SPLIT_DOC_TYPES = ['basic-design', 'detail-design', 'ut-spec', 'it-spec', 'st-spec'] as const

// ── Config types (from sekkei.config.yaml) ──

export interface ProjectConfig {
  project: {
    name: string
    type: string
    language: string
    description?: string
  }
  output: {
    directory: string
    format?: string
  }
  chain: Record<string, ChainConfigEntry>
  rfp?: string
  split_mode?: boolean
}

export interface ChainConfigEntry {
  status: 'pending' | 'in-progress' | 'complete'
  output?: string
  lifecycle?: string
  version?: string
  last_updated?: string
}

// ── Chain display types ──

export interface ChainEntry {
  docType: string
  status: string
  lifecycle: string | null
  version: string | null
  output: string | null
  lastModified: string | null
  features?: FeatureDocStatus[]
}

export interface FeatureDocStatus {
  featureId: string
  featureName: string
  status: string
}

export interface ChainGroup {
  phase: string
  label: string
  entries: ChainEntry[]
}

// ── Changelog types ──

export interface ChangelogEntry {
  date: string
  docType: string
  version: string
  changes: string
  author: string
  crId: string | null
}

// ── Change Request types ──

export interface CRSummary {
  id: string
  status: string
  originDoc: string
  description: string
  changedIds: string[]
  created: string
  updated: string
  propagationSteps: { target: string; status: string }[]
}

// ── Plan types ──

export interface PlanSummary {
  planId: string
  title: string
  docType: string
  status: string
  featureCount: number
  phases: { name: string; status: string }[]
}

// ── Analytics types ──

export interface CrossRefAnalysis {
  totalDefined: number
  totalReferenced: number
  missing: string[]
  orphaned: string[]
  coverageByType: { idType: string; defined: number; referenced: number; coverage: number }[]
}

export interface StalenessEntry {
  featureId: string
  label: string
  score: number
  affectedDocTypes: string[]
  daysSinceUpdate: number
}

export interface StalenessData {
  overallScore: number
  staleCount: number
  totalDocs: number
  entries: StalenessEntry[]
  warnings: { upstream: string; downstream: string; message: string }[]
}

export interface QualityData {
  docType: string
  valid: boolean
  issueCount: number
  errorCount: number
  warningCount: number
  crossRefCoverage: number
  sectionCompleteness: number
}

// ── API response shapes ──

export interface OverviewData {
  project: { name: string; type: string; language: string }
  totalDocs: number
  completionPct: number
  completed: number
  inProgress: number
  pending: number
  staleCount: number
  activeCRs: number
  chainEntries: ChainEntry[]
  recentChangelog: ChangelogEntry[]
  splitMode: boolean
}

export interface ChainData {
  project: { name: string; type: string; language: string }
  rfp: string | null
  groups: ChainGroup[]
  features: FeatureDocStatus[]
  splitMode: boolean
}

export interface AnalyticsData {
  crossRef: CrossRefAnalysis
  staleness: StalenessData
  quality: QualityData[]
}

export interface TimelinePoint {
  date: string
  count: number
  docTypes: string[]
}

export interface ChangesData {
  changelog: ChangelogEntry[]
  changeRequests: CRSummary[]
  timeline: TimelinePoint[]
}

export interface FeatureProgress {
  id: string
  name: string
  completion: number
  docs: { docType: string; status: 'complete' | 'in-progress' | 'pending' | 'not-applicable' }[]
}

export interface FeaturesData {
  splitMode: boolean
  features: FeatureProgress[]
  docTypes: string[]
}

export interface StatusData {
  mcpConnected: boolean
  version: string
}

// ── Service context passed to routes ──

export interface ServiceContext {
  docsRoot: string
  configPath: string
  configReader: { readConfig: (path: string) => Promise<ProjectConfig> }
  workspaceScanner: {
    scanChangeRequests: (sekkeiDir: string) => Promise<CRSummary[]>
    scanPlans: (sekkeiDir: string) => Promise<PlanSummary[]>
    scanFeatures: (docsRoot: string, config: ProjectConfig) => Promise<FeatureProgress[]>
    findSekkeiDir: (docsRoot: string) => string | null
  }
  changelogParser: { parseChangelog: (docsRoot: string) => Promise<ChangelogEntry[]> }
  mcpClient: { isConnected: () => boolean } | null
}
