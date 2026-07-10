import { useCallback, useEffect, useRef, useState } from 'react'

import {
  getStatus,
  hasStagedChange,
  hasUnstagedChange,
  stageFiles,
  unstageFiles,
} from '../lib/wails'
import type { FileStatus } from '../types'

export function useGitStatus(worktreePath: string) {
  const [entries, setEntries] = useState<FileStatus[]>([])
  const [loading, setLoading] = useState(() => !!worktreePath)
  const [error, setError] = useState<string | null>(null)
  const hasLoadedRef = useRef(false)

  const reload = useCallback(async () => {
    if (!worktreePath) {
      setEntries([])
      setError(null)
      setLoading(false)
      hasLoadedRef.current = false
      return
    }

    // 初回のみ一覧を「読み込み中…」に差し替える。再取得時は既存一覧を残す。
    if (!hasLoadedRef.current) {
      setLoading(true)
    }
    setError(null)
    try {
      const status = await getStatus(worktreePath)
      setEntries(status)
      hasLoadedRef.current = true
    } catch (err) {
      setEntries([])
      hasLoadedRef.current = false
      setError(err instanceof Error ? err.message : 'ステータスの取得に失敗しました')
    } finally {
      setLoading(false)
    }
  }, [worktreePath])

  useEffect(() => {
    hasLoadedRef.current = false
    void reload()
  }, [reload])

  const staged = entries.filter(hasStagedChange)
  const unstaged = entries.filter(hasUnstagedChange)

  const stage = useCallback(
    async (paths: string[]) => {
      if (!worktreePath || paths.length === 0) {
        return
      }
      await stageFiles(worktreePath, paths)
      await reload()
    },
    [worktreePath, reload],
  )

  const unstage = useCallback(
    async (paths: string[]) => {
      if (!worktreePath || paths.length === 0) {
        return
      }
      await unstageFiles(worktreePath, paths)
      await reload()
    },
    [worktreePath, reload],
  )

  return {
    entries,
    staged,
    unstaged,
    loading,
    error,
    reload,
    stage,
    unstage,
  }
}
