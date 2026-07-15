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
import {
  getWorktreeChangedCount,
  listBranches,
  listWorktrees,
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

      // 表示中のデータを消さない再取得では loading を立てない（チラつき防止）
      if (!keepVisible) {
        setLoading(true)
      }
      setError(null)
      try {
        const [branchEntries, worktreeEntries] = await Promise.all([
          listBranches(repoPath),
          listWorktrees(repoPath),
        ])
        if (requestId !== requestIdRef.current || activeRepoRef.current !== repoPath) {
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
          : (worktreeEntries.find((entry) => entry.isMain)?.path ??
            worktreeEntries[0]?.path ??
            null)

        const nextBranch =
          preserveSelection &&
          currentBranch &&
          branchEntries.some((entry) => !entry.isRemote && entry.name === currentBranch)
            ? currentBranch
            : (worktreeEntries.find((entry) => entry.path === nextWorktree)?.branch ?? null)

        const dataUnchanged = sidebarSnapshotEqual(
          branchesRef.current,
          worktreesRef.current,
          branchEntries,
          worktreeEntries,
        )

        if (!dataUnchanged) {
          setBranches(branchEntries)
          setWorktrees(worktreeEntries)
        }
        setSelectedWorktreeState(nextWorktree)
        setSelectedBranchState(nextBranch)
        setSidebarCache(repoPath, {
          branches: branchEntries,
          worktrees: worktreeEntries,
          selectedBranch: nextBranch,
          selectedWorktree: nextWorktree,
        })
      } catch (err) {
        if (requestId !== requestIdRef.current || activeRepoRef.current !== repoPath) {
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
    [],
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

    const cached = getSidebarCache(activeRepository)
    if (cached) {
      setBranches(cached.branches)
      setWorktrees(cached.worktrees)
      setSelectedBranchState(cached.selectedBranch)
      setSelectedWorktreeState(cached.selectedWorktree)
      setLoading(false)
      setError(null)
      void loadSidebar(activeRepository, { keepVisible: true, preserveSelection: true })
      return
    }

    // キャッシュなし: 他リポの表示を残さない（誤操作防止）。空+loading は UI 側で初回のみ表示。
    setBranches([])
    setWorktrees([])
    setSelectedBranchState(null)
    setSelectedWorktreeState(null)
    void loadSidebar(activeRepository, { keepVisible: false, preserveSelection: false })
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

  const setSelectedWorktree = useCallback(
    (path: string | null) => {
      setSelectedWorktreeState(path)
      if (activeRepository) {
        patchSidebarSelection(activeRepository, selectedBranch, path)
      }
    },
    [activeRepository, selectedBranch],
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
      setBranches(branchEntries)
      patchSidebarBranches(activeRepository, branchEntries)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'ブランチ情報の取得に失敗しました')
    }
  }, [activeRepository])

  /** 単一 WT の変更ファイル数バッジだけ更新。 */
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
        setWorktrees((current) =>
          current.map((entry) =>
            entry.path === worktreePath ? { ...entry, changedFileCount: count } : entry,
          ),
        )
        patchWorktreeChangedCount(activeRepository, worktreePath, count)
      } catch {
        // バッジ更新失敗は非致命
      }
    },
    [activeRepository],
  )

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
