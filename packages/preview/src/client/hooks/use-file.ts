import { useState, useEffect } from 'react'

export interface FileData {
  content: string
  path: string
  modified: string | null
}

export function useFile(path: string | null): { file: FileData | null; loading: boolean; error: string | null } {
  const [file, setFile] = useState<FileData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!path) { setFile(null); return }
    setLoading(true)
    setError(null)
    fetch(`/api/files?path=${encodeURIComponent(path)}`)
      .then(r => { if (!r.ok) throw new Error('Failed to load file'); return r.json() })
      .then((data: FileData) => setFile(data))
      .catch(e => setError((e as Error).message))
      .finally(() => setLoading(false))
  }, [path])

  return { file, loading, error }
}
