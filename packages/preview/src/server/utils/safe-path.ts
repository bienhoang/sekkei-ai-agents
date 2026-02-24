import { resolve, normalize } from 'node:path'
import { realpathSync } from 'node:fs'

/**
 * Resolve user-supplied path safely within docsRoot.
 * Prevents path traversal attacks.
 * Uses realpathSync to handle symlinks (e.g., macOS /tmp → /private/tmp).
 */
export function safePath(userPath: string, root: string): string {
  if (userPath.includes('\0')) {
    throw new Error('Path traversal detected')
  }

  const cleaned = userPath.replace(/^\/+/, '')
  const normalized = normalize(cleaned)

  if (normalized.startsWith('..')) {
    throw new Error('Path traversal detected')
  }

  let rootReal: string
  try {
    rootReal = realpathSync(root)
  } catch {
    rootReal = resolve(root)
  }

  const abs = resolve(rootReal, normalized)

  if (abs !== rootReal && !abs.startsWith(rootReal + '/')) {
    throw new Error('Path traversal detected')
  }

  return abs
}
