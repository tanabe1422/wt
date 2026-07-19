import { useCallback, useEffect, useRef, useState } from 'react'

import type { BranchEntry, WorktreeEntry } from '../types'
import {
  getSidebarCache,
  isSidebarCacheFresh,
  patchSidebarBranches,
  patchSidebarWorktreesMeta,
  patchWorktreeChangedCount,
  setSidebarCache,
} from '../lib/repoDataCache'
import { ensureRepoPrefetched } from '../lib/repoPrefetch'
import {
  fillBranchTracks,
  fillWorktreeBadges,
  mergeBranchTracks,
  mergeWorktreeBadgeCounts,
  sidebarSnapshotEqual,
} from '../lib/sidebarLoad'
import { pickDefaultWorktreePath, resolveSidebarLoadSelection } from '../lib/sidebarSelection'
import {
  getWorktreeChangedCount,
  listBranches,
  listWorktreesMeta,
} from '../lib/wails'
import type { SidebarSelectionApi } from './useSidebarSelection'

export function useSidebarData(activeRepository: string, selection: SidebarSelectionApi) {
  const [branches, setBranches] = useState<BranchEntry[]>([])
  const [worktrees, setWorktrees] = useState<WorktreeEntry[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const requestIdRef = useRef(0)
  const activeRepoRef = useRef(activeRepository)
  const branchesRef = useRef(branches)
  const worktreesRef = useRef(worktrees)

  const {
    selectedBranchRef,
    selectedWorktreeRef,
    clearSelection,
    applySelection,
    setSelectedBranchState,
    setSelectedWorktreeState,
  } = selection

  activeRepoRef.current = activeRepository
  branchesRef.current = branches
  worktreesRef.current = worktrees

  const applyBadgeCount = useCallback((worktreePath: string, count: number) => {
    setWorktrees((current) =>
      current.map((entry) =>
        entry.path === worktreePath ? { ...entry, changedFileCount: count } : entry,
      ),
    )
  }, [])

  const applyBadgeCounts = useCallback((counts: { path: string; count: number }[]) => {
    if (counts.length === 0) {
      return
    }
    const byPath = new Map(counts.map((item) => [item.path, item.count]))
    setWorktrees((current) => {
      let changed = false
      const next = current.map((entry) => {
        const count = byPath.get(entry.path)
        if (count === undefined || entry.changedFileCount === count) {
          return entry
        }
        changed = true
        return { ...entry, changedFileCount: count }
      })
      return changed ? next : current
    })
  }, [])

  const applyBranchTracks = useCallback((tracks: { name: string; ahead: number; behind: number }[]) => {
    if (tracks.length === 0) {
      return
    }
    const byName = new Map(tracks.map((track) => [track.name, track]))
    setBranches((current) => {
      let changed = false
      const next = current.map((entry) => {
        if (entry.isRemote || entry.isCurrent || !entry.hasUpstream) {
          return entry
        }
        const track = byName.get(entry.name)
        if (!track) {
          return entry
        }
        if (entry.aheadCount === track.ahead && entry.behindCount === track.behind) {
          return entry
        }
        changed = true
        return {
          ...entry,
          aheadCount: track.ahead,
          behindCount: track.behind,
        }
      })
      if (!changed) {
        return current
      }
      const repoPath = activeRepoRef.current
      if (repoPath) {
        patchSidebarBranches(repoPath, next)
      }
      return next
    })
  }, [])

  const loadSidebar = useCallback(
    async (
      repoPath: string,
      options: { keepVisible?: boolean; preserveSelection?: boolean } = {},
    ) => {
      const { keepVisible = false, preserveSelection = false } = options

      if (!repoPath) {
        setBranches([])
        setWorktrees([])
        clearSelection()
        setError(null)
        setLoading(false)
        return
      }

      const requestId = ++requestIdRef.current
      const isCurrent = () =>
        requestId === requestIdRef.current && activeRepoRef.current === repoPath

      // 表示中のデータを消さない再取得では loading を立てない（チラつき防止）
      if (!keepVisible) {
        setLoading(true)
      }
      setError(null)
      try {
        // Meta のみ（全 WT の git status は走らせない）。branches と並列。
        const branchesPromise = listBranches(repoPath)
        const metaPromise = listWorktreesMeta(repoPath)

        // 同一 metaPromise で早期選択し、GetStatus を branches 完了前に開始できるようにする。
        const needsEarlyWorktree =
          !preserveSelection ||
          selectedWorktreeRef.current === null ||
          selectedWorktreeRef.current === ''
        if (needsEarlyWorktree) {
          void metaPromise
            .then((meta) => {
              if (!isCurrent() || selectedWorktreeRef.current) {
                return
              }
              const earlyPath = pickDefaultWorktreePath(meta, null)
              if (!earlyPath) {
                return
              }
              setSelectedWorktreeState(earlyPath)
              if (!selectedBranchRef.current) {
                setSelectedBranchState(
                  meta.find((entry) => entry.path === earlyPath)?.branch ?? null,
                )
              }
            })
            .catch(() => {
              // 早期確定の失敗はフル取得に委ねる
            })
        }

        const [branchEntries, worktreeEntries] = await Promise.all([
          branchesPromise,
          metaPromise,
        ])
        if (!isCurrent()) {
          return
        }

        const { selectedWorktree: nextWorktree, selectedBranch: nextBranch } =
          resolveSidebarLoadSelection(
            worktreeEntries,
            branchEntries,
            {
              selectedWorktree: selectedWorktreeRef.current,
              selectedBranch: selectedBranchRef.current,
            },
            preserveSelection,
          )

        // バッジは後から埋めるので、既存カウントを path で引き継ぐ（チラつき防止）
        const mergedWorktrees = mergeWorktreeBadgeCounts(worktreeEntries, worktreesRef.current)
        const mergedBranches = mergeBranchTracks(branchEntries, branchesRef.current)

        const dataUnchanged = sidebarSnapshotEqual(
          branchesRef.current,
          worktreesRef.current,
          mergedBranches,
          mergedWorktrees,
        )

        if (!dataUnchanged) {
          setBranches(mergedBranches)
          setWorktrees(mergedWorktrees)
        }
        applySelection(nextBranch, nextWorktree)
        setSidebarCache(repoPath, {
          branches: mergedBranches,
          worktrees: mergedWorktrees,
          selectedBranch: nextBranch,
          selectedWorktree: nextWorktree,
        })

        // バッジ埋めはクリティカルパス外（選択 WT 優先）
        void fillWorktreeBadges(repoPath, mergedWorktrees, nextWorktree, isCurrent, (counts) => {
          if (!isCurrent()) {
            return
          }
          applyBadgeCounts(counts)
        })
        void fillBranchTracks(repoPath, mergedBranches, isCurrent, (tracks) => {
          if (!isCurrent()) {
            return
          }
          applyBranchTracks(tracks)
        })
      } catch (err) {
        if (!isCurrent()) {
          return
        }
        if (!keepVisible) {
          setBranches([])
          setWorktrees([])
          clearSelection()
        }
        setError(err instanceof Error ? err.message : 'リポジトリ情報の取得に失敗しました')
      } finally {
        if (requestId === requestIdRef.current) {
          setLoading(false)
        }
      }
    },
    [
      applyBadgeCounts,
      applyBranchTracks,
      applySelection,
      clearSelection,
      selectedBranchRef,
      selectedWorktreeRef,
      setSelectedBranchState,
      setSelectedWorktreeState,
    ],
  )

  useEffect(() => {
    if (!activeRepository) {
      setBranches([])
      setWorktrees([])
      clearSelection()
      setError(null)
      setLoading(false)
      return
    }

    let cancelled = false
    const repoPath = activeRepository

    const applyCached = () => {
      const cached = getSidebarCache(repoPath)
      if (!cached) {
        return false
      }
      setBranches(cached.branches)
      setWorktrees(cached.worktrees)
      applySelection(cached.selectedBranch, cached.selectedWorktree)
      setLoading(false)
      setError(null)
      return true
    }

    const fillBackgroundFromCache = () => {
      const cached = getSidebarCache(repoPath)
      if (!cached) {
        return
      }
      const requestId = ++requestIdRef.current
      const isCurrent = () =>
        requestId === requestIdRef.current && activeRepoRef.current === repoPath
      void fillWorktreeBadges(
        repoPath,
        cached.worktrees,
        cached.selectedWorktree,
        isCurrent,
        (counts) => {
          if (!isCurrent()) {
            return
          }
          applyBadgeCounts(counts)
        },
      )
      void fillBranchTracks(repoPath, cached.branches, isCurrent, (tracks) => {
        if (!isCurrent()) {
          return
        }
        applyBranchTracks(tracks)
      })
    }

    if (applyCached()) {
      // prefetch / Go warm 直後は同じ ListBranches+Meta をやり直さない
      if (isSidebarCacheFresh(repoPath)) {
        fillBackgroundFromCache()
        return
      }
      void loadSidebar(repoPath, { keepVisible: true, preserveSelection: true })
      return
    }

    // キャッシュなし: 他リポの表示を残さない。起動時 prefetch 完了を待ってから再判定。
    setBranches([])
    setWorktrees([])
    clearSelection()
    setLoading(true)

    void ensureRepoPrefetched(repoPath).then(() => {
      if (cancelled || activeRepoRef.current !== repoPath) {
        return
      }
      if (applyCached()) {
        if (isSidebarCacheFresh(repoPath)) {
          fillBackgroundFromCache()
          return
        }
        void loadSidebar(repoPath, { keepVisible: true, preserveSelection: true })
        return
      }
      void loadSidebar(repoPath, { keepVisible: false, preserveSelection: false })
    })

    return () => {
      cancelled = true
    }
  }, [activeRepository, applyBadgeCounts, applyBranchTracks, applySelection, clearSelection, loadSidebar])

  const refreshWorktreeBadge = useCallback(
    async (worktreePath: string) => {
      if (!activeRepository || !worktreePath) {
        return
      }
      try {
        const count = await getWorktreeChangedCount(worktreePath)
        if (activeRepoRef.current !== activeRepository) {
          return
        }
        applyBadgeCount(worktreePath, count)
        patchWorktreeChangedCount(activeRepository, worktreePath, count)
      } catch {
        // バッジ更新失敗は非致命
      }
    },
    [activeRepository, applyBadgeCount],
  )

  const reload = useCallback(
    () => loadSidebar(activeRepository, { keepVisible: true, preserveSelection: true }),
    [activeRepository, loadSidebar],
  )

  /** ahead/behind などブランチ情報だけ更新。全 WT の status は走らせない。 */
  const reloadBranches = useCallback(async () => {
    if (!activeRepository) {
      return
    }
    setError(null)
    try {
      const branchEntries = await listBranches(activeRepository)
      if (activeRepoRef.current !== activeRepository) {
        return
      }
      const mergedBranches = mergeBranchTracks(branchEntries, branchesRef.current)
      setBranches(mergedBranches)
      patchSidebarBranches(activeRepository, mergedBranches)

      const requestId = requestIdRef.current
      const repoPath = activeRepository
      const isCurrent = () =>
        requestId === requestIdRef.current && activeRepoRef.current === repoPath
      void fillBranchTracks(repoPath, mergedBranches, isCurrent, (tracks) => {
        if (!isCurrent()) {
          return
        }
        applyBranchTracks(tracks)
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'ブランチ情報の取得に失敗しました')
    }
  }, [activeRepository, applyBranchTracks])

  /** WT 一覧メタ（path/branch）だけ。status スキャンなし。更新後の meta を返す。 */
  const reloadWorktreesMeta = useCallback(async (): Promise<WorktreeEntry[] | undefined> => {
    if (!activeRepository) {
      return undefined
    }
    setError(null)
    try {
      const meta = await listWorktreesMeta(activeRepository)
      if (activeRepoRef.current !== activeRepository) {
        return undefined
      }
      setWorktrees((current) => mergeWorktreeBadgeCounts(meta, current))
      patchSidebarWorktreesMeta(activeRepository, meta)
      return meta
    } catch (err) {
      setError(err instanceof Error ? err.message : 'ワークツリー情報の取得に失敗しました')
      return undefined
    }
  }, [activeRepository])

  /**
   * 全 WT の変更数バッジを裏で一括更新（busy なし・選択 WT 優先）。
   * ウィンドウ復帰時など、フル sidebar 再取得なしでバッジだけ揃える用。
   */
  const refreshWorktreeBadges = useCallback(() => {
    if (!activeRepository) {
      return
    }
    const repoPath = activeRepository
    const requestId = requestIdRef.current
    const entries = worktreesRef.current
    if (entries.length === 0) {
      return
    }
    const isCurrent = () =>
      requestId === requestIdRef.current && activeRepoRef.current === repoPath
    void fillWorktreeBadges(
      repoPath,
      entries,
      selectedWorktreeRef.current,
      isCurrent,
      (counts) => {
        if (!isCurrent()) {
          return
        }
        applyBadgeCounts(counts)
      },
    )
  }, [activeRepository, applyBadgeCounts, selectedWorktreeRef])

  return {
    branches,
    worktrees,
    loading,
    error,
    reload,
    reloadBranches,
    refreshWorktreeBadge,
    refreshWorktreeBadges,
    reloadWorktreesMeta,
  }
}
