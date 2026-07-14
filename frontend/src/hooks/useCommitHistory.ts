import { useCallback, useEffect, useRef, useState } from 'react'

import { getHistoryScope, setHistoryScope } from '../lib/historyScopeStorage'
import { listBranchHeads, listCommits } from '../lib/wails'
import type { BranchHead, CommitLogEntry, CommitSearchType, HistoryScope } from '../types'

const PAGE_SIZE = 50
const SEARCH_DEBOUNCE_MS = 300
/** Search shows the first hit ASAP, then fills the rest of the page. */
const SEARCH_FIRST_HIT_LIMIT = 1

interface UseCommitHistoryOptions {
  worktreePath: string
  currentBranch: string
}

export function useCommitHistory({ worktreePath, currentBranch }: UseCommitHistoryOptions) {
  const [scope, setScopeState] = useState<HistoryScope>(() => getHistoryScope(worktreePath))
  const [searchType, setSearchType] = useState<CommitSearchType>('path')
  const [searchQuery, setSearchQuery] = useState('')
  const [debouncedQuery, setDebouncedQuery] = useState('')
  const [commits, setCommits] = useState<CommitLogEntry[]>([])
  const [labels, setLabels] = useState<BranchHead[]>([])
  const [hasMore, setHasMore] = useState(false)
  const [loading, setLoading] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const nextSkipRef = useRef(0)
  const loadingRef = useRef(false)
  const loadGenRef = useRef(0)
  const searchTypeRef = useRef(searchType)
  const debouncedQueryRef = useRef(debouncedQuery)

  searchTypeRef.current = searchType
  debouncedQueryRef.current = debouncedQuery

  useEffect(() => {
    setScopeState(getHistoryScope(worktreePath))
    setSearchQuery('')
    setDebouncedQuery('')
  }, [worktreePath])

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedQuery(searchQuery.trim())
    }, SEARCH_DEBOUNCE_MS)
    return () => window.clearTimeout(timer)
  }, [searchQuery])

  const resetAndLoad = useCallback(
    async (nextScope: HistoryScope, nextSearchType: CommitSearchType, nextQuery: string) => {
      if (!worktreePath) {
        setCommits([])
        setLabels([])
        setHasMore(false)
        setError(null)
        return
      }

      const gen = ++loadGenRef.current
      loadingRef.current = true
      setLoading(true)
      setLoadingMore(false)
      setError(null)
      setCommits([])
      setHasMore(false)
      nextSkipRef.current = 0

      const branch = nextScope === 'branch' ? currentBranch : ''
      const activeQuery = nextQuery.trim()
      const searchTypeArg = activeQuery ? nextSearchType : ''

      try {
        if (activeQuery) {
          // 1) First matching commit only — returns as soon as Git finds it.
          const [heads, first] = await Promise.all([
            listBranchHeads(worktreePath),
            listCommits(
              worktreePath,
              nextScope,
              branch,
              0,
              SEARCH_FIRST_HIT_LIMIT,
              searchTypeArg,
              activeQuery,
            ),
          ])
          if (gen !== loadGenRef.current) {
            return
          }
          setLabels(heads)
          setCommits(first.commits)
          setHasMore(first.hasMore)
          nextSkipRef.current = first.nextSkip
          setLoading(false)

          if (!first.hasMore || first.commits.length === 0) {
            loadingRef.current = false
            return
          }

          // 2) Fill the rest of the first page while the first hit is already visible.
          setLoadingMore(true)
          const restLimit = PAGE_SIZE - first.commits.length
          const rest = await listCommits(
            worktreePath,
            nextScope,
            branch,
            first.nextSkip,
            restLimit,
            searchTypeArg,
            activeQuery,
          )
          if (gen !== loadGenRef.current) {
            return
          }
          setCommits((prev) => [...prev, ...rest.commits])
          setHasMore(rest.hasMore)
          nextSkipRef.current = rest.nextSkip
          setLoadingMore(false)
          loadingRef.current = false
          return
        }

        const [heads, page] = await Promise.all([
          listBranchHeads(worktreePath),
          listCommits(worktreePath, nextScope, branch, 0, PAGE_SIZE, '', ''),
        ])
        if (gen !== loadGenRef.current) {
          return
        }
        setLabels(heads)
        setCommits(page.commits)
        setHasMore(page.hasMore)
        nextSkipRef.current = page.nextSkip
      } catch (err) {
        if (gen !== loadGenRef.current) {
          return
        }
        setCommits([])
        setLabels([])
        setHasMore(false)
        setError(err instanceof Error ? err.message : String(err))
      } finally {
        if (gen === loadGenRef.current) {
          loadingRef.current = false
          setLoading(false)
          setLoadingMore(false)
        }
      }
    },
    [worktreePath, currentBranch],
  )

  useEffect(() => {
    void resetAndLoad(scope, searchType, debouncedQuery)
  }, [resetAndLoad, scope, searchType, debouncedQuery])

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

    const gen = loadGenRef.current
    loadingRef.current = true
    setLoadingMore(true)
    setError(null)

    try {
      const branch = scope === 'branch' ? currentBranch : ''
      const activeQuery = debouncedQueryRef.current.trim()
      const page = await listCommits(
        worktreePath,
        scope,
        branch,
        nextSkipRef.current,
        PAGE_SIZE,
        activeQuery ? searchTypeRef.current : '',
        activeQuery,
      )
      if (gen !== loadGenRef.current) {
        return
      }
      setCommits((prev) => [...prev, ...page.commits])
      setHasMore(page.hasMore)
      nextSkipRef.current = page.nextSkip
    } catch (err) {
      if (gen !== loadGenRef.current) {
        return
      }
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      if (gen === loadGenRef.current) {
        loadingRef.current = false
        setLoadingMore(false)
      }
    }
  }, [worktreePath, scope, currentBranch, hasMore])

  const reload = useCallback(
    () => resetAndLoad(scope, searchType, debouncedQuery),
    [resetAndLoad, scope, searchType, debouncedQuery],
  )

  return {
    scope,
    setScope,
    searchType,
    setSearchType,
    searchQuery,
    setSearchQuery,
    activeSearchQuery: debouncedQuery,
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
