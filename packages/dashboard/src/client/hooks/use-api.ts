import { useState, useEffect, useCallback } from 'react'
import { useRefresh } from './use-refresh'

interface ApiResult<T> {
  data: T | null
  loading: boolean
  error: string | null
  refetch: () => void
}

export function useApi<T>(url: string, params?: Record<string, string>): ApiResult<T> {
  const { refreshKey } = useRefresh()
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [localKey, setLocalKey] = useState(0)

  const refetch = useCallback(() => setLocalKey(k => k + 1), [])

  useEffect(() => {
    const controller = new AbortController()
    setLoading(true)
    setError(null)

    let fullUrl = url
    if (params) {
      const search = new URLSearchParams(params).toString()
      if (search) fullUrl += `?${search}`
    }
    // Add refresh flag when triggered by manual refresh
    if (refreshKey > 0 || localKey > 0) {
      fullUrl += (fullUrl.includes('?') ? '&' : '?') + 'refresh=true'
    }

    fetch(fullUrl, { signal: controller.signal })
      .then(res => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        return res.json()
      })
      .then(json => setData(json as T))
      .catch(err => {
        if (err.name !== 'AbortError') setError(err.message)
      })
      .finally(() => setLoading(false))

    return () => controller.abort()
  }, [url, refreshKey, localKey, params ? JSON.stringify(params) : ''])

  return { data, loading, error, refetch }
}
