import { useCallback, useEffect, useRef, useState } from 'react'

import { commitDiffKey, getDiffCache, invalidateDiffCache } from '../lib/diffCache'
import { fetchAndCacheDiff } from '../lib/diffPrefetch'
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
  const generationRef = useRef(0)

  const reload = useCallback(
    async (opts?: { bypassCache?: boolean }) => {
      if (!worktreePath || !sha || !file) {
        generationRef.current += 1
        setDiff(null)
        setError(null)
        setLoading(false)
        return
      }

      const key = commitDiffKey(worktreePath, sha, file)
      const generation = ++generationRef.current

      if (!opts?.bypassCache) {
        const cached = getDiffCache(key)
        if (cached) {
          setDiff(cached)
          setError(null)
          setLoading(false)
          return
        }
      } else {
        invalidateDiffCache(key)
      }

      setLoading(true)
      setError(null)
      try {
        const result = await fetchAndCacheDiff(
          key,
          () => getCommitFileDiff(worktreePath, sha, file),
          { force: opts?.bypassCache },
        )
        if (generation !== generationRef.current) {
          return
        }
        setDiff(result)
      } catch (err) {
        if (generation !== generationRef.current) {
          return
        }
        setDiff(null)
        setError(err instanceof Error ? err.message : 'diff の取得に失敗しました')
      } finally {
        if (generation === generationRef.current) {
          setLoading(false)
        }
      }
    },
    [worktreePath, sha, file],
  )

  useEffect(() => {
    void reload()
  }, [reload])

  const forceReload = useCallback(() => reload({ bypassCache: true }), [reload])

  return { diff, loading, error, reload: forceReload }
}
