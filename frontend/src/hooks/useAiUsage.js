import { useCallback, useEffect, useState } from 'react'
import api from '../services/api'

export default function useAiUsage() {
  const [usage, setUsage] = useState(null)
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(() => {
    setLoading(true)
    return api.get('/ai-usage')
      .then((res) => setUsage(res.data))
      .catch(() => setUsage(null))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { refresh() }, [refresh])

  const hasEnough = useCallback((cost = 1) => {
    if (!usage) return true
    return usage.remaining >= cost
  }, [usage])

  return { usage, loading, refresh, hasEnough }
}
