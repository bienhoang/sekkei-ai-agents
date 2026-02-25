/**
 * Basic Mermaid diagram validation — syntax check + complexity warning.
 * Lightweight: no external dependencies; pattern-based checks only.
 */

export interface MermaidIssue {
  type: "syntax" | "complexity";
  message: string;
  block: number;
}

const VALID_DIAGRAM_TYPES = [
  "graph", "flowchart", "sequenceDiagram", "classDiagram",
  "stateDiagram", "stateDiagram-v2", "erDiagram", "gantt",
  "pie", "journey", "gitgraph",
];

/** Count approximate node count in a Mermaid block */
function countNodes(block: string): number {
  const nodePattern = /\b([A-Za-z_]\w*)\s*[\[({\|>]/g;
  const nodes = new Set<string>();
  let m;
  while ((m = nodePattern.exec(block)) !== null) {
    if (!VALID_DIAGRAM_TYPES.includes(m[1]) && m[1] !== "subgraph" && m[1] !== "end") {
      nodes.add(m[1]);
    }
  }
  return nodes.size;
}

/** Validate all Mermaid code blocks in markdown content */
export function validateMermaidBlocks(content: string): MermaidIssue[] {
  const issues: MermaidIssue[] = [];
  const blockRe = /```mermaid\s*\n([\s\S]*?)```/g;
  let match;
  let idx = 0;

  while ((match = blockRe.exec(content)) !== null) {
    const block = match[1].trim();
    const firstLine = block.split("\n")[0].trim();

    // Check diagram type
    const hasValidType = VALID_DIAGRAM_TYPES.some(t => firstLine.startsWith(t));
    if (!hasValidType) {
      issues.push({
        type: "syntax",
        message: `Mermaid block #${idx + 1}: unknown diagram type "${firstLine.split(/\s/)[0]}"`,
        block: idx,
      });
    }

    // Check balanced brackets
    const opens = (block.match(/[\[({]/g) ?? []).length;
    const closes = (block.match(/[\])}]/g) ?? []).length;
    if (opens !== closes) {
      issues.push({
        type: "syntax",
        message: `Mermaid block #${idx + 1}: unbalanced brackets (${opens} open, ${closes} close)`,
        block: idx,
      });
    }

    // Complexity check
    const nodeCount = countNodes(block);
    if (nodeCount > 50) {
      issues.push({
        type: "complexity",
        message: `Mermaid block #${idx + 1}: ${nodeCount} nodes detected (> 50). Consider splitting into sub-diagrams.`,
        block: idx,
      });
    }

    idx++;
  }

  return issues;
}
