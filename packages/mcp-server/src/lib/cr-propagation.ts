/**
 * Compute propagation order for a change request.
 * Given an origin doc type, returns upstream (reverse) + downstream (forward) steps.
 */
import { CHAIN_PAIRS } from "./cross-ref-linker.js";
import type { PropagationStep } from "../types/change-request.js";

/**
 * BFS through CHAIN_PAIRS to find all reachable docs in a given direction.
 * "upstream" walks backwards (find pairs where target matches current).
 * "downstream" walks forwards (find pairs where source matches current).
 * Optional maxDepth limits traversal depth (hops from origin).
 */
function bfs(origin: string, direction: "upstream" | "downstream", maxDepth?: number): string[] {
  const visited = new Set<string>();
  const queue: Array<{ node: string; depth: number }> = [{ node: origin, depth: 0 }];
  const result: string[] = [];

  while (queue.length > 0) {
    const { node: current, depth } = queue.shift()!;
    if (maxDepth !== undefined && depth >= maxDepth) continue;
    for (const [src, dst] of CHAIN_PAIRS) {
      const neighbor = direction === "downstream" ? dst : src;
      const matchSide = direction === "downstream" ? src : dst;

      if (matchSide === current && !visited.has(neighbor)) {
        visited.add(neighbor);
        result.push(neighbor);
        queue.push({ node: neighbor, depth: depth + 1 });
      }
    }
  }

  return result;
}

/**
 * Compute ordered propagation steps for a CR originating from the given doc type.
 * Returns upstream steps (furthest first) then downstream steps (nearest first).
 * IMP-3: Supports maxDepth (limit hops) and skipDocs (exclude specific doc types).
 */
export function computePropagationOrder(
  originDoc: string,
  options?: { maxDepth?: number; skipDocs?: string[] }
): PropagationStep[] {
  const upstreamDocs = bfs(originDoc, "upstream", options?.maxDepth);
  const downstreamDocs = bfs(originDoc, "downstream", options?.maxDepth);

  // Reverse upstream so furthest-upstream appears first
  upstreamDocs.reverse();

  const skipSet = new Set(options?.skipDocs ?? []);
  const steps: PropagationStep[] = [];

  for (const doc of upstreamDocs) {
    if (!skipSet.has(doc)) steps.push({ doc_type: doc, direction: "upstream", status: "pending" });
  }
  for (const doc of downstreamDocs) {
    if (!skipSet.has(doc)) steps.push({ doc_type: doc, direction: "downstream", status: "pending" });
  }

  return steps;
}
