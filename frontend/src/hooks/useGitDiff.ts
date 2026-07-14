import { useCallback, useEffect, useRef, useState } from 'react'

import { getDiffCache, invalidateDiffCache, worktreeDiffKey } from '../lib/diffCache'
import { fetchAndCacheDiff } from '../lib/diffPrefetch'
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
  const generationRef = useRef(0)

  const reload = useCallback(
    async (opts?: { bypassCache?: boolean }) => {
      if (!worktreePath || !file) {
        generationRef.current += 1
        setDiff(null)
        setError(null)
        setLoading(false)
        return
      }

      const key = worktreeDiffKey(worktreePath, file, staged)
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

      // Keep previous diff until the new one arrives to avoid empty-panel flash.
      setLoading(true)
      setError(null)
      try {
        const result = await fetchAndCacheDiff(
          key,
          () => getFileDiff(worktreePath, file, staged),
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
    [worktreePath, file, staged],
  )

  useEffect(() => {
    void reload()
  }, [reload])

  const forceReload = useCallback(() => reload({ bypassCache: true }), [reload])

  return { diff, loading, error, reload: forceReload }
}
