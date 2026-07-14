import { useCallback, useEffect, useRef, useState } from 'react'

import { getHistoryScope, setHistoryScope } from '../lib/historyScopeStorage'
import { listBranchHeads, listCommits } from '../lib/wails'
import type { BranchHead, CommitLogEntry, HistoryScope } from '../types'

const PAGE_SIZE = 50

interface UseCommitHistoryOptions {
  worktreePath: string
  currentBranch: string
}

export function useCommitHistory({ worktreePath, currentBranch }: UseCommitHistoryOptions) {
  const [scope, setScopeState] = useState<HistoryScope>(() => getHistoryScope(worktreePath))
  const [commits, setCommits] = useState<CommitLogEntry[]>([])
  const [labels, setLabels] = useState<BranchHead[]>([])
  const [hasMore, setHasMore] = useState(false)
  const [loading, setLoading] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const nextSkipRef = useRef(0)
  const loadingRef = useRef(false)

  useEffect(() => {
    setScopeState(getHistoryScope(worktreePath))
  }, [worktreePath])

  const resetAndLoad = useCallback(
    async (nextScope: HistoryScope) => {
      if (!worktreePath) {
        setCommits([])
        setLabels([])
        setHasMore(false)
        setError(null)
        return
      }

      loadingRef.current = true
      setLoading(true)
      setError(null)
      nextSkipRef.current = 0

      try {
        const branch = nextScope === 'branch' ? currentBranch : ''
        const [heads, page] = await Promise.all([
          listBranchHeads(worktreePath),
          listCommits(worktreePath, nextScope, branch, 0, PAGE_SIZE),
        ])
        setLabels(heads)
        setCommits(page.commits)
        setHasMore(page.hasMore)
        nextSkipRef.current = page.nextSkip
      } catch (err) {
        setCommits([])
        setLabels([])
        setHasMore(false)
        setError(err instanceof Error ? err.message : String(err))
      } finally {
        loadingRef.current = false
        setLoading(false)
      }
    },
    [worktreePath, currentBranch],
  )

  useEffect(() => {
    void resetAndLoad(scope)
  }, [resetAndLoad, scope])

  const setScope = useCallback(
    (nextScope: HistoryScope) => {
      setScopeState(nextScope)
      setHistoryScope(worktreePath, nextScope)
    },
    [worktreePath],
  )

  const loadMore = useCallback(async () => {
    if (!worktreePath || !hasMore || loadingRef.current) {
      return
    }

    loadingRef.current = true
    setLoadingMore(true)
    setError(null)

    try {
      const branch = scope === 'branch' ? currentBranch : ''
      const page = await listCommits(
        worktreePath,
        scope,
        branch,
        nextSkipRef.current,
        PAGE_SIZE,
      )
      setCommits((prev) => [...prev, ...page.commits])
      setHasMore(page.hasMore)
      nextSkipRef.current = page.nextSkip
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      loadingRef.current = false
      setLoadingMore(false)
    }
  }, [worktreePath, scope, currentBranch, hasMore])

  const reload = useCallback(() => resetAndLoad(scope), [resetAndLoad, scope])

  return {
    scope,
    setScope,
    commits,
    labels,
    hasMore,
    loading,
    loadingMore,
    error,
    loadMore,
    reload,
  }
}
