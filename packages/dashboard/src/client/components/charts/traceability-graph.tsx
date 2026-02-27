import { useCallback, useMemo, useState } from 'react'
import { ReactFlow, Background, Controls, useNodesState, useEdgesState, type Node, type Edge, type NodeMouseHandler } from '@xyflow/react'
import '@xyflow/react/dist/style.css'
// @ts-ignore — @dagrejs/dagre has types but bundler resolution may differ
import dagre from '@dagrejs/dagre'
import { TraceNode, type TraceNodeData } from './trace-node'
import { TraceSidebar } from './trace-sidebar'

// ── Types ────────────────────────────────────────────────────────────────────

interface CoverageByType {
  idType: string
  defined: number
  referenced: number
  coverage: number
}

interface CrossRefAnalysis {
  totalDefined: number
  totalReferenced: number
  missing: string[]
  orphaned: string[]
  coverageByType: CoverageByType[]
}

interface AnalyticsData {
  crossRef: CrossRefAnalysis
}

// ── V-Model chain definition ──────────────────────────────────────────────────

const CHAIN_PHASES: { phase: string; types: string[] }[] = [
  { phase: 'requirements', types: ['requirements', 'functions-list', 'nfr', 'project-plan'] },
  { phase: 'design', types: ['basic-design', 'security-design', 'detail-design'] },
  { phase: 'test', types: ['test-plan', 'ut-spec', 'it-spec', 'st-spec', 'uat-spec'] },
  { phase: 'supplementary', types: ['sitemap', 'operation-design', 'migration-design'] },
]

// Edges representing the V-model document chain flow
const CHAIN_EDGES: [string, string][] = [
  ['requirements', 'functions-list'],
  ['requirements', 'nfr'],
  ['requirements', 'project-plan'],
  ['functions-list', 'basic-design'],
  ['nfr', 'basic-design'],
  ['basic-design', 'security-design'],
  ['basic-design', 'detail-design'],
  ['detail-design', 'test-plan'],
  ['test-plan', 'ut-spec'],
  ['test-plan', 'it-spec'],
  ['test-plan', 'st-spec'],
  ['test-plan', 'uat-spec'],
]

const NODE_WIDTH = 160
const NODE_HEIGHT = 50

// ── Dagre layout ─────────────────────────────────────────────────────────────

function applyDagreLayout(nodes: Node[], edges: Edge[]): Node[] {
  const g = new dagre.graphlib.Graph()
  g.setDefaultEdgeLabel(() => ({}))
  g.setGraph({ rankdir: 'LR', ranksep: 100, nodesep: 50 })

  nodes.forEach(n => g.setNode(n.id, { width: NODE_WIDTH, height: NODE_HEIGHT }))
  edges.forEach(e => g.setEdge(e.source, e.target))

  dagre.layout(g)

  return nodes.map(n => {
    const pos = g.node(n.id)
    return {
      ...n,
      position: {
        x: pos.x - NODE_WIDTH / 2,
        y: pos.y - NODE_HEIGHT / 2,
      },
    }
  })
}

// ── Transform analytics data to ReactFlow nodes/edges ─────────────────────────

function buildGraph(crossRef: CrossRefAnalysis): { nodes: Node[]; edges: Edge[] } {
  const coverageMap = new Map<string, CoverageByType>()
  for (const c of crossRef.coverageByType) {
    coverageMap.set(c.idType.toLowerCase(), c)
  }

  const orphanedCount = crossRef.orphaned.length
  const missingCount = crossRef.missing.length
  const totalIssues = orphanedCount + missingCount

  // Collect all doc types that appear in chain
  const allDocTypes = new Set(CHAIN_PHASES.flatMap(p => p.types))

  const rawNodes: Node[] = []
  for (const { phase, types } of CHAIN_PHASES) {
    for (const docType of types) {
      const cov = coverageMap.get(docType)
      const tracedPct = cov ? Math.round(cov.coverage) : 0

      // Distribute issues proportionally across nodes (simplified heuristic)
      const nodeOrphaned = Math.round((orphanedCount / Math.max(allDocTypes.size, 1)))
      const nodeMissing = Math.round((missingCount / Math.max(allDocTypes.size, 1)))

      const nodeData: TraceNodeData = {
        label: docType,
        phase,
        orphanedCount: cov ? nodeOrphaned : 0,
        missingCount: cov ? nodeMissing : 0,
        tracedPct,
      }

      rawNodes.push({
        id: docType,
        type: 'traceNode',
        position: { x: 0, y: 0 },
        data: nodeData as unknown as Record<string, unknown>,
      })
    }
  }

  void totalIssues

  const rawEdges: Edge[] = CHAIN_EDGES
    .filter(([src, tgt]) => allDocTypes.has(src) && allDocTypes.has(tgt))
    .map(([src, tgt]) => {
      const srcCov = coverageMap.get(src)
      const hasIssue = srcCov ? srcCov.coverage < 50 : false
      return {
        id: `${src}->${tgt}`,
        source: src,
        target: tgt,
        style: hasIssue
          ? { stroke: '#ef4444', strokeDasharray: '5 3' }
          : { stroke: '#94a3b8' },
      }
    })

  const laidOut = applyDagreLayout(rawNodes, rawEdges)
  return { nodes: laidOut, edges: rawEdges }
}

// ── Component ─────────────────────────────────────────────────────────────────

const NODE_TYPES = { traceNode: TraceNode }

interface TraceabilityGraphProps {
  data: AnalyticsData
}

function TraceabilityGraph({ data }: TraceabilityGraphProps) {
  const { nodes: initialNodes, edges: initialEdges } = useMemo(
    () => buildGraph(data.crossRef),
    [data]
  )

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes)
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges)
  const [selectedNodeData, setSelectedNodeData] = useState<TraceNodeData | null>(null)

  const onNodeClick: NodeMouseHandler = useCallback((_evt, clickedNode) => {
    const nodeData = clickedNode.data as unknown as TraceNodeData
    setSelectedNodeData(nodeData)

    // Find connected node IDs
    const connectedIds = new Set<string>([clickedNode.id])
    for (const e of initialEdges) {
      if (e.source === clickedNode.id) connectedIds.add(e.target)
      if (e.target === clickedNode.id) connectedIds.add(e.source)
    }

    // Dim non-connected nodes
    setNodes(nds =>
      nds.map(n => ({
        ...n,
        style: connectedIds.has(n.id) ? { opacity: 1 } : { opacity: 0.3 },
      }))
    )

    // Dim non-connected edges
    setEdges(eds =>
      eds.map(e => ({
        ...e,
        style: {
          ...e.style,
          opacity: connectedIds.has(e.source) && connectedIds.has(e.target) ? 1 : 0.2,
        },
      }))
    )
  }, [initialEdges, setNodes, setEdges])

  const onPaneClick = useCallback(() => {
    setSelectedNodeData(null)
    setNodes(nds => nds.map(n => ({ ...n, style: { opacity: 1 } })))
    setEdges(eds => eds.map(e => ({ ...e, style: { ...e.style, opacity: 1 } })))
  }, [setNodes, setEdges])

  const cr = data.crossRef
  const completenessScore = cr.totalDefined > 0
    ? Math.round((cr.totalReferenced / cr.totalDefined) * 100)
    : 0
  const brokenLinkCount = cr.missing.length + cr.orphaned.length

  return (
    <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg p-4">
      <h3 className="font-medium mb-4 text-sm">Traceability Matrix</h3>
      <div className="flex gap-4">
        <div className="flex-1 rounded-lg overflow-hidden border border-[var(--color-border)]" style={{ height: 420 }}>
          <ReactFlow
            nodes={nodes}
            edges={edges}
            nodeTypes={NODE_TYPES}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onNodeClick={onNodeClick}
            onPaneClick={onPaneClick}
            fitView
            fitViewOptions={{ padding: 0.2 }}
            minZoom={0.3}
            maxZoom={2}
          >
            <Background gap={16} color="var(--color-border)" />
            <Controls />
          </ReactFlow>
        </div>
        <TraceSidebar
          completenessScore={completenessScore}
          brokenLinkCount={brokenLinkCount}
          selectedNode={selectedNodeData}
        />
      </div>
    </div>
  )
}

export default TraceabilityGraph
