interface ReadResult {
  content: string
  frontmatter: string
  path: string
}

interface ListResult {
  files: Array<{ path: string; title: string }>
}

/**
 * Composable for interacting with the sekkei file API endpoints.
 */
export function useFileApi() {
  async function read(path: string): Promise<ReadResult> {
    const res = await fetch(`/__api/read?path=${encodeURIComponent(path)}`)
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: `HTTP ${res.status}` }))
      throw new Error(err.error ?? `Failed to read: ${res.status}`)
    }
    return res.json()
  }

  async function save(path: string, content: string): Promise<void> {
    const res = await fetch('/__api/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path, content }),
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: `HTTP ${res.status}` }))
      throw new Error(err.error ?? `Failed to save: ${res.status}`)
    }
  }

  async function list(): Promise<ListResult> {
    const res = await fetch('/__api/list')
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: `HTTP ${res.status}` }))
      throw new Error(err.error ?? `Failed to list: ${res.status}`)
    }
    return res.json()
  }

  return { read, save, list }
}
