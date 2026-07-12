import { useCallback, useEffect, useState } from 'react'

import { listRangeFiles } from '../lib/wails'
import type { CommitFileChange } from '../types'

export function useRangeFiles(
  worktreePath: string,
  fromRef: string | null,
  toRef: string | null,
) {
  const [files, setFiles] = useState<CommitFileChange[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const reload = useCallback(async () => {
    if (!worktreePath || !fromRef || !toRef) {
      setFiles([])
      setError(null)
      return
    }

    setLoading(true)
    setError(null)
    try {
      const result = await listRangeFiles(worktreePath, fromRef, toRef)
      setFiles(result)
    } catch (err) {
      setFiles([])
      setError(err instanceof Error ? err.message : '変更ファイルの取得に失敗しました')
    } finally {
      setLoading(false)
    }
  }, [worktreePath, fromRef, toRef])

  useEffect(() => {
    void reload()
  }, [reload])

  return { files, loading, error, reload }
}
