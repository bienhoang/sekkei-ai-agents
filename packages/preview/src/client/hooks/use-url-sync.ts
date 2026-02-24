import { useEffect, useRef } from 'react'
import type { TreeNode } from './use-tree.js'
import { resolveDefaultPage } from '../utils/default-page-resolver.js'

interface UrlSyncOptions {
  activePath: string | null
  tree: TreeNode[]
  treeLoading: boolean
  onInitialResolve: (path: string) => void
  onNavigate: (path: string) => void
}

function filePathToUrl(filePath: string): string {
  return '/' + filePath.split('/').map(encodeURIComponent).join('/')
}

function urlPathToFilePath(pathname: string): string {
  return pathname.replace(/^\//, '').split('/').map(decodeURIComponent).join('/')
}

function fileExistsInTree(tree: TreeNode[], path: string): boolean {
  const segments = path.split('/').filter(Boolean)
  let nodes = tree
  for (let i = 0; i < segments.length; i++) {
    const seg = segments[i]
    const isLast = i === segments.length - 1
    const node = nodes.find(n => n.name === seg)
    if (!node) return false
    if (isLast) return node.type === 'file'
    if (node.type === 'directory' && node.children) {
      nodes = node.children
    } else {
      return false
    }
  }
  return false
}

function isDirectoryInTree(tree: TreeNode[], path: string): boolean {
  const segments = path.split('/').filter(Boolean)
  if (segments.length === 0) return false
  let nodes = tree
  for (const seg of segments) {
    const node = nodes.find(n => n.type === 'directory' && n.name === seg)
    if (!node?.children) return false
    nodes = node.children
  }
  return true
}

export function useUrlSync({ activePath, tree, treeLoading, onInitialResolve, onNavigate }: UrlSyncOptions) {
  const initialResolved = useRef(false)
  const onNavigateRef = useRef(onNavigate)
  onNavigateRef.current = onNavigate

  // Effect 1: Initial URL resolution on mount + tree ready
  useEffect(() => {
    if (treeLoading || tree.length === 0 || initialResolved.current) return
    initialResolved.current = true

    const filePath = urlPathToFilePath(location.pathname)

    let resolved: string | null = null
    if (!filePath) {
      resolved = resolveDefaultPage(tree)
    } else if (fileExistsInTree(tree, filePath)) {
      resolved = filePath
    } else if (isDirectoryInTree(tree, filePath)) {
      resolved = resolveDefaultPage(tree, filePath)
    } else {
      resolved = resolveDefaultPage(tree)
    }

    if (resolved) {
      history.replaceState({}, '', filePathToUrl(resolved))
      onInitialResolve(resolved)
    }
  }, [tree, treeLoading, onInitialResolve])

  // Effect 2: Push URL on activePath change
  useEffect(() => {
    if (!activePath || !initialResolved.current) return
    const expected = filePathToUrl(activePath)
    if (location.pathname === expected) return
    history.pushState({}, '', expected)
  }, [activePath])

  // Effect 3: Popstate listener for back/forward (stable — uses ref)
  useEffect(() => {
    function handlePopstate() {
      const filePath = urlPathToFilePath(location.pathname)
      if (filePath && fileExistsInTree(tree, filePath)) {
        onNavigateRef.current(filePath)
      }
    }
    window.addEventListener('popstate', handlePopstate)
    return () => window.removeEventListener('popstate', handlePopstate)
  }, [tree])
}
