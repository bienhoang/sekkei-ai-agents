import type { TreeNode } from '../hooks/use-tree.js'

const INDEX_PATTERNS = ['index.md', 'home.md', 'front.md', 'readme.md']

export function findChildFiles(tree: TreeNode[], dirPath?: string): TreeNode[] {
  if (!dirPath) return tree.filter(n => n.type === 'file')

  const segments = dirPath.split('/').filter(Boolean)
  let nodes = tree
  for (const seg of segments) {
    const dir = nodes.find(n => n.type === 'directory' && n.name === seg)
    if (!dir?.children) return []
    nodes = dir.children
  }
  return nodes.filter(n => n.type === 'file')
}

export function resolveDefaultPage(tree: TreeNode[], dirPath?: string): string | null {
  const files = findChildFiles(tree, dirPath)
  if (files.length === 0) return null

  for (const pattern of INDEX_PATTERNS) {
    const match = files.find(f => f.name.toLowerCase() === pattern)
    if (match) return match.path
  }

  const numbered = files.find(f => /^\d/.test(f.name))
  if (numbered) return numbered.path

  return files[0].path
}
