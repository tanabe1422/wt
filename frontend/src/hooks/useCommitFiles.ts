import { useCallback, useEffect, useState } from 'react'

import { listCommitFiles } from '../lib/wails'
import type { CommitFileChange } from '../types'

export function useCommitFiles(worktreePath: string, sha: string | null) {
  const [files, setFiles] = useState<CommitFileChange[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const reload = useCallback(async () => {
    if (!worktreePath || !sha) {
      setFiles([])
      setError(null)
      return
    }

    setLoading(true)
    setError(null)
    try {
      const result = await listCommitFiles(worktreePath, sha)
      setFiles(result)
    } catch (err) {
      setFiles([])
      setError(err instanceof Error ? err.message : '変更ファイルの取得に失敗しました')
    } finally {
      setLoading(false)
    }
  }, [worktreePath, sha])

  useEffect(() => {
    void reload()
  }, [reload])

  return { files, loading, error, reload }
}
