import { useCallback, useEffect, useRef, useState } from 'react'

import { listStashFiles } from '../lib/wails'
import type { CommitFileChange } from '../types'

export function useStashFiles(worktreePath: string, index: number | null) {
  const [files, setFiles] = useState<CommitFileChange[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const generationRef = useRef(0)

  const reload = useCallback(async () => {
    if (!worktreePath || index === null) {
      generationRef.current += 1
      setFiles([])
      setError(null)
      setLoading(false)
      return
    }

    const generation = ++generationRef.current
    setLoading(true)
    setError(null)
    try {
      const result = await listStashFiles(worktreePath, index)
      if (generation !== generationRef.current) {
        return
      }
      setFiles(result)
    } catch (err) {
      if (generation !== generationRef.current) {
        return
      }
      setFiles([])
      setError(err instanceof Error ? err.message : '変更ファイルの取得に失敗しました')
    } finally {
      if (generation === generationRef.current) {
        setLoading(false)
      }
    }
  }, [worktreePath, index])

  useEffect(() => {
    void reload()
  }, [reload])

  return { files, loading, error, reload }
}
