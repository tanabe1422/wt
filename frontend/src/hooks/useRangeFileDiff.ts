import { useCallback, useEffect, useState } from 'react'

import { getRangeFileDiff } from '../lib/wails'
import type { FileDiff } from '../types'

export function useRangeFileDiff(
  worktreePath: string,
  fromRef: string | null,
  toRef: string | null,
  file: string | null,
) {
  const [diff, setDiff] = useState<FileDiff | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const reload = useCallback(async () => {
    if (!worktreePath || !fromRef || !toRef || !file) {
      setDiff(null)
      setError(null)
      return
    }

    setLoading(true)
    setError(null)
    try {
      const result = await getRangeFileDiff(worktreePath, fromRef, toRef, file)
      setDiff(result)
    } catch (err) {
      setDiff(null)
      setError(err instanceof Error ? err.message : 'diff の取得に失敗しました')
    } finally {
      setLoading(false)
    }
  }, [worktreePath, fromRef, toRef, file])

  useEffect(() => {
    void reload()
  }, [reload])

  return { diff, loading, error, reload }
}
