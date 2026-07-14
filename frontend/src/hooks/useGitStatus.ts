import { useCallback, useEffect, useRef, useState } from 'react'

import { invalidateWorktreeDiffs } from '../lib/diffCache'
import { getStatusCache, setStatusCache } from '../lib/repoDataCache'
import {
  getStatus,
  hasStagedChange,
  hasUnstagedChange,
  stageFiles,
  unstageFiles,
} from '../lib/wails'
import type { FileStatus } from '../types'

export function useGitStatus(worktreePath: string) {
  const [entries, setEntries] = useState<FileStatus[]>(() =>
    worktreePath ? (getStatusCache(worktreePath) ?? []) : [],
  )
  const [loading, setLoading] = useState(() => {
    if (!worktreePath) {
      return false
    }
    return getStatusCache(worktreePath) === undefined
  })
  const [error, setError] = useState<string | null>(null)
  const hasLoadedRef = useRef(worktreePath ? getStatusCache(worktreePath) !== undefined : false)

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
      setStatusCache(worktreePath, status)
      hasLoadedRef.current = true
    } catch (err) {
      if (!hasLoadedRef.current) {
        setEntries([])
      }
      setError(err instanceof Error ? err.message : 'ステータスの取得に失敗しました')
    } finally {
      setLoading(false)
    }
  }, [worktreePath])

  useEffect(() => {
    if (!worktreePath) {
      hasLoadedRef.current = false
      setEntries([])
      setLoading(false)
      setError(null)
      return
    }

    const cached = getStatusCache(worktreePath)
    if (cached) {
      setEntries(cached)
      hasLoadedRef.current = true
      setLoading(false)
      setError(null)
    } else {
      hasLoadedRef.current = false
    }
    void reload()
  }, [reload, worktreePath])

  const staged = entries.filter(hasStagedChange)
  const unstaged = entries.filter(hasUnstagedChange)

  const stage = useCallback(
    async (paths: string[]) => {
      if (!worktreePath || paths.length === 0) {
        return
      }
      await stageFiles(worktreePath, paths)
      invalidateWorktreeDiffs(worktreePath)
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
      invalidateWorktreeDiffs(worktreePath)
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
