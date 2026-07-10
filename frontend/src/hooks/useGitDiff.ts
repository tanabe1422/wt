import { useCallback, useEffect, useState } from 'react'

import { getFileDiff } from '../lib/wails'
import type { FileDiff } from '../types'

export function useGitDiff(
  worktreePath: string,
  file: string | null,
  staged: boolean,
) {
  const [diff, setDiff] = useState<FileDiff | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const reload = useCallback(async () => {
    if (!worktreePath || !file) {
      setDiff(null)
      setError(null)
      return
    }

    setLoading(true)
    setError(null)
    try {
      const result = await getFileDiff(worktreePath, file, staged)
      setDiff(result)
    } catch (err) {
      setDiff(null)
      setError(err instanceof Error ? err.message : 'diff の取得に失敗しました')
    } finally {
      setLoading(false)
    }
  }, [worktreePath, file, staged])

  useEffect(() => {
    void reload()
  }, [reload])

  return { diff, loading, error, reload }
}
