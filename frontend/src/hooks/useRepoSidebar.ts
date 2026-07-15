import { useCallback, useEffect, useRef, useState } from 'react'

import type { BranchEntry, WorktreeEntry } from '../types'
import {
  getSidebarCache,
  patchSidebarBranches,
  patchSidebarSelection,
  patchSidebarWorktreesMeta,
  patchWorktreeChangedCount,
  setSidebarCache,
} from '../lib/repoDataCache'
import { ensureRepoPrefetched } from '../lib/repoPrefetch'
import { pickDefaultWorktreePath } from '../lib/sidebarSelection'
import {
  getBranchAheadBehind,
  getWorktreeChangedCount,
  listBranches,
  listWorktreesMeta,
} from '../lib/wails'

function sidebarSnapshotEqual(
  branchesA: BranchEntry[],
  worktreesA: WorktreeEntry[],
  branchesB: BranchEntry[],
  worktreesB: WorktreeEntry[],
): boolean {
  if (branchesA.length !== branchesB.length || worktreesA.length !== worktreesB.length) {
    return false
  }
  for (let i = 0; i < branchesA.length; i++) {
    const a = branchesA[i]
    const b = branchesB[i]
    if (
      a.name !== b.name ||
      a.isRemote !== b.isRemote ||
      a.isCurrent !== b.isCurrent ||
      a.aheadCount !== b.aheadCount ||
      a.behindCount !== b.behindCount ||
      a.hasUpstream !== b.hasUpstream
    ) {
      return false
    }
  }
  for (let i = 0; i < worktreesA.length; i++) {
    const a = worktreesA[i]
    const b = worktreesB[i]
    if (
      a.path !== b.path ||
      a.branch !== b.branch ||
      a.isMain !== b.isMain ||
      a.changedFileCount !== b.changedFileCount
    ) {
      return false
    }
  }
  return true
}

/** ListBranches は現行ブランチの track だけ埋める。他は裏で順次。 */
async function fillBranchTracks(
  repoPath: string,
  entries: BranchEntry[],
  isCurrent: () => boolean,
  onTrack: (branch: string, ahead: number, behind: number) => void,
): Promise<void> {
  const targets = entries.filter((entry) => !entry.isRemote && entry.hasUpstream && !entry.isCurrent)
  for (const entry of targets) {
    if (!isCurrent()) {
      return
    }
    try {
      const { ahead, behind } = await getBranchAheadBehind(repoPath, entry.name)
      if (!isCurrent()) {
        return
      }
      onTrack(entry.name, ahead, behind)
    } catch {
      // ahead/behind 更新失敗は非致命
    }
  }
}

function mergeBranchTracks(incoming: BranchEntry[], previous: BranchEntry[]): BranchEntry[] {
  const prevByName = new Map(previous.map((entry) => [entry.name, entry]))
  return incoming.map((entry) => {
    if (entry.isRemote || entry.isCurrent || !entry.hasUpstream) {
      return entry
    }
    const prev = prevByName.get(entry.name)
    if (!prev) {
      return entry
    }
    return {
      ...entry,
      aheadCount: prev.aheadCount,
      behindCount: prev.behindCount,
    }
  })
}

/**
 * Meta 表示後にバッジを埋める。選択中 WT を優先し、残りは順次（起動クリティカルパス外）。
 */
async function fillWorktreeBadges(
  repoPath: string,
  entries: WorktreeEntry[],
  preferredPath: string | null,
  isCurrent: () => boolean,
  onCount: (worktreePath: string, count: number) => void,
): Promise<void> {
  const ordered = [...entries].sort((a, b) => {
    if (a.path === preferredPath) return -1
    if (b.path === preferredPath) return 1
    return 0
  })
  for (const entry of ordered) {
    if (!isCurrent()) {
      return
    }
    try {
      const count = await getWorktreeChangedCount(entry.path)
      if (!isCurrent()) {
        return
      }
      onCount(entry.path, count)
      patchWorktreeChangedCount(repoPath, entry.path, count)
    } catch {
      // バッジ更新失敗は非致命
    }
  }
}

export function useRepoSidebar(activeRepository: string) {
  const [branches, setBranches] = useState<BranchEntry[]>([])
  const [worktrees, setWorktrees] = useState<WorktreeEntry[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedBranch, setSelectedBranchState] = useState<string | null>(null)
  const [selectedWorktree, setSelectedWorktreeState] = useState<string | null>(null)
  const requestIdRef = useRef(0)
  const activeRepoRef = useRef(activeRepository)
  const branchesRef = useRef(branches)
  const worktreesRef = useRef(worktrees)
  const selectedBranchRef = useRef(selectedBranch)
  const selectedWorktreeRef = useRef(selectedWorktree)

  activeRepoRef.current = activeRepository
  branchesRef.current = branches
  worktreesRef.current = worktrees
  selectedBranchRef.current = selectedBranch
  selectedWorktreeRef.current = selectedWorktree

  const applyBadgeCount = useCallback((worktreePath: string, count: number) => {
    setWorktrees((current) =>
      current.map((entry) =>
        entry.path === worktreePath ? { ...entry, changedFileCount: count } : entry,
      ),
    )
  }, [])

  const applyBranchTrack = useCallback((branch: string, ahead: number, behind: number) => {
    setBranches((current) => {
      const next = current.map((entry) =>
        entry.name === branch ? { ...entry, aheadCount: ahead, behindCount: behind } : entry,
      )
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
        setSelectedBranchState(null)
        setSelectedWorktreeState(null)
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

        const currentWorktree = selectedWorktreeRef.current
        const currentBranch = selectedBranchRef.current
        const keepCurrent =
          preserveSelection &&
          currentWorktree !== null &&
          currentWorktree !== '' &&
          worktreeEntries.some((entry) => entry.path === currentWorktree)

        const nextWorktree = keepCurrent
          ? currentWorktree
          : pickDefaultWorktreePath(worktreeEntries, null)

        const nextBranch =
          preserveSelection &&
          currentBranch &&
          branchEntries.some((entry) => !entry.isRemote && entry.name === currentBranch)
            ? currentBranch
            : (worktreeEntries.find((entry) => entry.path === nextWorktree)?.branch ?? null)

        // バッジは後から埋めるので、既存カウントを path で引き継ぐ（チラつき防止）
        const prevByPath = new Map(worktreesRef.current.map((entry) => [entry.path, entry]))
        const mergedWorktrees = worktreeEntries.map((entry) => {
          const prev = prevByPath.get(entry.path)
          return prev ? { ...entry, changedFileCount: prev.changedFileCount } : entry
        })
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
        setSelectedWorktreeState(nextWorktree)
        setSelectedBranchState(nextBranch)
        setSidebarCache(repoPath, {
          branches: mergedBranches,
          worktrees: mergedWorktrees,
          selectedBranch: nextBranch,
          selectedWorktree: nextWorktree,
        })

        // バッジ埋めはクリティカルパス外（選択 WT 優先）
        void fillWorktreeBadges(repoPath, mergedWorktrees, nextWorktree, isCurrent, (path, count) => {
          if (!isCurrent()) {
            return
          }
          applyBadgeCount(path, count)
        })
        void fillBranchTracks(repoPath, mergedBranches, isCurrent, (name, ahead, behind) => {
          if (!isCurrent()) {
            return
          }
          applyBranchTrack(name, ahead, behind)
        })
      } catch (err) {
        if (!isCurrent()) {
          return
        }
        if (!keepVisible) {
          setBranches([])
          setWorktrees([])
          setSelectedBranchState(null)
          setSelectedWorktreeState(null)
        }
        setError(err instanceof Error ? err.message : 'リポジトリ情報の取得に失敗しました')
      } finally {
        if (requestId === requestIdRef.current) {
          setLoading(false)
        }
      }
    },
    [applyBadgeCount, applyBranchTrack],
  )

  useEffect(() => {
    if (!activeRepository) {
      setBranches([])
      setWorktrees([])
      setSelectedBranchState(null)
      setSelectedWorktreeState(null)
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
      setSelectedBranchState(cached.selectedBranch)
      setSelectedWorktreeState(cached.selectedWorktree)
      setLoading(false)
      setError(null)
      return true
    }

    if (applyCached()) {
      void loadSidebar(repoPath, { keepVisible: true, preserveSelection: true })
      return
    }

    // キャッシュなし: 他リポの表示を残さない。起動時 prefetch 完了を待ってから再判定。
    setBranches([])
    setWorktrees([])
    setSelectedBranchState(null)
    setSelectedWorktreeState(null)
    setLoading(true)

    void ensureRepoPrefetched(repoPath).then(() => {
      if (cancelled || activeRepoRef.current !== repoPath) {
        return
      }
      if (applyCached()) {
        void loadSidebar(repoPath, { keepVisible: true, preserveSelection: true })
        return
      }
      void loadSidebar(repoPath, { keepVisible: false, preserveSelection: false })
    })

    return () => {
      cancelled = true
    }
  }, [activeRepository, loadSidebar])

  const setSelectedBranch = useCallback(
    (branch: string | null) => {
      setSelectedBranchState(branch)
      if (activeRepository) {
        patchSidebarSelection(activeRepository, branch, selectedWorktree)
      }
    },
    [activeRepository, selectedWorktree],
  )

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

  const setSelectedWorktree = useCallback(
    (path: string | null) => {
      setSelectedWorktreeState(path)
      if (activeRepository) {
        patchSidebarSelection(activeRepository, selectedBranch, path)
      }
      // 切替先のバッジが未取得でもすぐ埋める
      if (path) {
        void refreshWorktreeBadge(path)
      }
    },
    [activeRepository, selectedBranch, refreshWorktreeBadge],
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
      void fillBranchTracks(repoPath, mergedBranches, isCurrent, (name, ahead, behind) => {
        if (!isCurrent()) {
          return
        }
        applyBranchTrack(name, ahead, behind)
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'ブランチ情報の取得に失敗しました')
    }
  }, [activeRepository, applyBranchTrack])

  /** WT 一覧メタ（path/branch）だけ。status スキャンなし。 */
  const reloadWorktreesMeta = useCallback(async () => {
    if (!activeRepository) {
      return
    }
    setError(null)
    try {
      const meta = await listWorktreesMeta(activeRepository)
      if (activeRepoRef.current !== activeRepository) {
        return
      }
      setWorktrees((current) => {
        const prevByPath = new Map(current.map((entry) => [entry.path, entry]))
        return meta.map((entry) => {
          const prev = prevByPath.get(entry.path)
          return prev
            ? { ...entry, changedFileCount: prev.changedFileCount }
            : entry
        })
      })
      patchSidebarWorktreesMeta(activeRepository, meta)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'ワークツリー情報の取得に失敗しました')
    }
  }, [activeRepository])

  return {
    branches,
    worktrees,
    loading,
    error,
    selectedBranch,
    setSelectedBranch,
    selectedWorktree,
    setSelectedWorktree,
    reload,
    reloadBranches,
    refreshWorktreeBadge,
    reloadWorktreesMeta,
  }
}
