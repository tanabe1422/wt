import { useCallback, useEffect, useRef, useState } from 'react'

import { getStashFileDiff } from '../lib/wails'
import type { FileDiff } from '../types'

export function useStashFileDiff(
  worktreePath: string,
  index: number | null,
  file: string | null,
) {
  const [diff, setDiff] = useState<FileDiff | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const generationRef = useRef(0)

  const reload = useCallback(async () => {
    if (!worktreePath || index === null || !file) {
      generationRef.current += 1
      setDiff(null)
      setError(null)
      setLoading(false)
      return
    }

    const generation = ++generationRef.current
    setLoading(true)
    setError(null)
    try {
      const result = await getStashFileDiff(worktreePath, index, file)
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
  }, [worktreePath, index, file])

  useEffect(() => {
    void reload()
  }, [reload])

  return { diff, loading, error, reload }
}
