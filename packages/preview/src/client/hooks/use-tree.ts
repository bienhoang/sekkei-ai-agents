import { useState, useEffect } from 'react'

export interface TreeNode {
  name: string
  type: 'file' | 'directory'
  path: string
  children?: TreeNode[]
}

export function useTree(): { tree: TreeNode[]; loading: boolean; error: string | null } {
  const [tree, setTree] = useState<TreeNode[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/tree')
      .then(r => { if (!r.ok) throw new Error('Failed to load tree'); return r.json() })
      .then((data: TreeNode[]) => setTree(data))
      .catch(e => setError((e as Error).message))
      .finally(() => setLoading(false))
  }, [])

  return { tree, loading, error }
}
