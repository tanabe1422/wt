import { useCallback, useEffect, useState } from 'react'

import type { BranchEntry, WorktreeEntry } from '../types'
import {
  getSidebarCache,
  patchSidebarBranches,
  patchSidebarSelection,
  setSidebarCache,
} from '../lib/repoDataCache'
import { listBranches, listWorktrees } from '../lib/wails'

export function useRepoSidebar(activeRepository: string) {
  const [branches, setBranches] = useState<BranchEntry[]>([])
  const [worktrees, setWorktrees] = useState<WorktreeEntry[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedBranch, setSelectedBranchState] = useState<string | null>(null)
  const [selectedWorktree, setSelectedWorktreeState] = useState<string | null>(null)

  const loadSidebar = useCallback(async (repoPath: string, preserveSelection = false) => {
    if (!repoPath) {
      setBranches([])
      setWorktrees([])
      setSelectedBranchState(null)
      setSelectedWorktreeState(null)
      setError(null)
      setLoading(false)
      return
    }

    if (!preserveSelection) {
      setLoading(true)
    }
    setError(null)
    try {
      const [branchEntries, worktreeEntries] = await Promise.all([
        listBranches(repoPath),
        listWorktrees(repoPath),
      ])
      setBranches(branchEntries)
      setWorktrees(worktreeEntries)

      setSelectedWorktreeState((currentWorktree) => {
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

        setSelectedBranchState((currentBranch) => {
          const nextBranch =
            preserveSelection &&
            currentBranch &&
            branchEntries.some((entry) => !entry.isRemote && entry.name === currentBranch)
              ? currentBranch
              : (worktreeEntries.find((entry) => entry.path === nextWorktree)?.branch ?? null)

          setSidebarCache(repoPath, {
            branches: branchEntries,
            worktrees: worktreeEntries,
            selectedBranch: nextBranch,
            selectedWorktree: nextWorktree,
          })
          return nextBranch
        })

        return nextWorktree
      })
    } catch (err) {
      if (!preserveSelection) {
        setBranches([])
        setWorktrees([])
        setSelectedBranchState(null)
        setSelectedWorktreeState(null)
      }
      setError(err instanceof Error ? err.message : 'リポジトリ情報の取得に失敗しました')
    } finally {
      setLoading(false)
    }
  }, [])

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
      void loadSidebar(activeRepository, true)
      return
    }

    void loadSidebar(activeRepository, false)
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
    () => loadSidebar(activeRepository, true),
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
      setBranches(branchEntries)
      patchSidebarBranches(activeRepository, branchEntries)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'ブランチ情報の取得に失敗しました')
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
  }
}
