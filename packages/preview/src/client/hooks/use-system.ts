import { useState, useEffect } from 'react'

export interface SystemInfo {
  version: string
  mode: 'workspace' | 'guide'
}

export function useSystem(): SystemInfo | null {
  const [info, setInfo] = useState<SystemInfo | null>(null)

  useEffect(() => {
    fetch('/api/system')
      .then(r => r.json())
      .then((data: SystemInfo) => setInfo(data))
      .catch(() => setInfo({ version: '?', mode: 'workspace' }))
  }, [])

  return info
}
