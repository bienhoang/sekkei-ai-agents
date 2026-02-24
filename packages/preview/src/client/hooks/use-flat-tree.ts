import { useMemo } from 'react'
import type { TreeNode } from './use-tree.js'

export interface FlatFile {
  path: string
  name: string
}

function flatten(nodes: TreeNode[]): FlatFile[] {
  const result: FlatFile[] = []
  for (const node of nodes) {
    if (node.type === 'file') {
      result.push({ path: node.path, name: node.name })
    } else if (node.children) {
      result.push(...flatten(node.children))
    }
  }
  return result
}

export function useFlatTree(tree: TreeNode[]): FlatFile[] {
  return useMemo(() => flatten(tree), [tree])
}
