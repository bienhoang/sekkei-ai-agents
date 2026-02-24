import { readdir } from 'node:fs/promises'
import { Dirent } from 'node:fs'
import { join, extname, relative } from 'node:path'

export interface TreeNode {
  name: string
  type: 'file' | 'directory'
  path: string
  children?: TreeNode[]
}

const SKIP_NAMES = new Set(['node_modules', '.git', '.vitepress'])
const SKIP_EXTS = new Set(['.yaml', '.yml'])

/**
 * Recursively scan docsRoot and return a nested tree.
 * Directories first, then files (both numeric-sorted within group).
 * Skip hidden entries, node_modules, .yaml/.yml, non-.md files.
 */
export async function scanTree(docsRoot: string, dir = docsRoot): Promise<TreeNode[]> {
  let entries: Dirent[] = []
  try {
    const result = await readdir(dir, { withFileTypes: true })
    entries = Array.from(result)
  } catch {
    return []
  }

  const visible = entries.filter((e: Dirent) => {
    if (e.name.startsWith('.')) return false
    if (SKIP_NAMES.has(e.name)) return false
    if (e.isFile() && SKIP_EXTS.has(extname(e.name))) return false
    if (e.isFile() && extname(e.name) !== '.md') return false
    return true
  })

  // index.md always first, then interleave files and dirs sorted numerically
  const indexIdx = visible.findIndex((e: Dirent) => e.isFile() && e.name === 'index.md')
  const indexEntry = indexIdx >= 0 ? visible.splice(indexIdx, 1)[0] : null

  visible.sort((a: Dirent, b: Dirent) =>
    a.name.localeCompare(b.name, undefined, { numeric: true })
  )

  const ordered = indexEntry ? [indexEntry, ...visible] : visible

  const nodes: TreeNode[] = []
  for (const entry of ordered) {
    const fullPath = join(dir, entry.name)
    const relPath = relative(docsRoot, fullPath)

    if (entry.isDirectory()) {
      const children = await scanTree(docsRoot, fullPath)
      if (children.length > 0) {
        nodes.push({ name: entry.name, type: 'directory', path: relPath, children })
      }
    } else {
      nodes.push({ name: entry.name, type: 'file', path: relPath })
    }
  }

  return nodes
}
