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
 */
function bfs(origin: string, direction: "upstream" | "downstream"): string[] {
  const visited = new Set<string>();
  const queue: string[] = [origin];
  const result: string[] = [];

  while (queue.length > 0) {
    const current = queue.shift()!;
    for (const [src, dst] of CHAIN_PAIRS) {
      const neighbor = direction === "downstream" ? dst : src;
      const matchSide = direction === "downstream" ? src : dst;

      if (matchSide === current && !visited.has(neighbor)) {
        visited.add(neighbor);
        result.push(neighbor);
        queue.push(neighbor);
      }
    }
  }

  return result;
}

/**
 * Compute ordered propagation steps for a CR originating from the given doc type.
 * Returns upstream steps (furthest first) then downstream steps (nearest first).
 */
export function computePropagationOrder(originDoc: string): PropagationStep[] {
  const upstreamDocs = bfs(originDoc, "upstream");
  const downstreamDocs = bfs(originDoc, "downstream");

  // Reverse upstream so furthest-upstream appears first
  upstreamDocs.reverse();

  const steps: PropagationStep[] = [];

  for (const doc of upstreamDocs) {
    steps.push({ doc_type: doc, direction: "upstream", status: "pending" });
  }
  for (const doc of downstreamDocs) {
    steps.push({ doc_type: doc, direction: "downstream", status: "pending" });
  }

  return steps;
}
