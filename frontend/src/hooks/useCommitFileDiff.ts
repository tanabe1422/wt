import { useCallback, useEffect, useState } from 'react'

import { getCommitFileDiff } from '../lib/wails'
import type { FileDiff } from '../types'

export function useCommitFileDiff(
  worktreePath: string,
  sha: string | null,
  file: string | null,
) {
  const [diff, setDiff] = useState<FileDiff | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const reload = useCallback(async () => {
    if (!worktreePath || !sha || !file) {
      setDiff(null)
      setError(null)
      return
    }

    setLoading(true)
    setError(null)
    try {
      const result = await getCommitFileDiff(worktreePath, sha, file)
      setDiff(result)
    } catch (err) {
      setDiff(null)
      setError(err instanceof Error ? err.message : 'diff の取得に失敗しました')
    } finally {
      setLoading(false)
    }
  }, [worktreePath, sha, file])

  useEffect(() => {
    void reload()
  }, [reload])

  return { diff, loading, error, reload }
}
