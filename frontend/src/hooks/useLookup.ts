import { useState, useCallback } from 'react'
import { lookup } from '@/lib/api'
import type { LookupResult } from '@/types'

export function useLookup() {
  const [result, setResult] = useState<LookupResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const doLookup = useCallback(async (identifier: string) => {
    if (!identifier.trim()) return
    setLoading(true)
    setError(null)
    try {
      const data = await lookup(identifier)
      setResult(data)
      return data
    } catch (err: any) {
      const msg = err.response?.data?.error?.message || 'Lookup failed. Please try again.'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }, [])

  const clear = useCallback(() => {
    setResult(null)
    setError(null)
  }, [])

  return { result, loading, error, lookup: doLookup, clear }
}
