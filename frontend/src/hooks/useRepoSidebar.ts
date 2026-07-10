import { useCallback, useEffect, useState } from 'react'

import type { BranchEntry, WorktreeEntry } from '../types'
import { listBranches, listWorktrees } from '../lib/wails'

export function useRepoSidebar(activeRepository: string) {
  const [branches, setBranches] = useState<BranchEntry[]>([])
  const [worktrees, setWorktrees] = useState<WorktreeEntry[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedBranch, setSelectedBranch] = useState<string | null>(null)
  const [selectedWorktree, setSelectedWorktree] = useState<string | null>(null)

  const loadSidebar = useCallback(async (repoPath: string, preserveSelection = false) => {
    if (!repoPath) {
      setBranches([])
      setWorktrees([])
      setSelectedBranch(null)
      setSelectedWorktree(null)
      setError(null)
      return
    }

    setLoading(true)
    setError(null)
    try {
      const [branchEntries, worktreeEntries] = await Promise.all([
        listBranches(repoPath),
        listWorktrees(repoPath),
      ])
      setBranches(branchEntries)
      setWorktrees(worktreeEntries)

      setSelectedWorktree((currentWorktree) => {
        const keepCurrent =
          preserveSelection &&
          currentWorktree !== null &&
          worktreeEntries.some((entry) => entry.path === currentWorktree)

        const nextWorktree = keepCurrent
          ? currentWorktree
          : (worktreeEntries.find((entry) => entry.isMain)?.path ??
            worktreeEntries[0]?.path ??
            null)

        setSelectedBranch((currentBranch) => {
          if (
            preserveSelection &&
            currentBranch &&
            branchEntries.some((entry) => !entry.isRemote && entry.name === currentBranch)
          ) {
            return currentBranch
          }
          const worktree = worktreeEntries.find((entry) => entry.path === nextWorktree)
          return worktree?.branch ?? null
        })

        return nextWorktree
      })
    } catch (err) {
      setBranches([])
      setWorktrees([])
      setSelectedBranch(null)
      setSelectedWorktree(null)
      setError(err instanceof Error ? err.message : 'リポジトリ情報の取得に失敗しました')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadSidebar(activeRepository)
  }, [activeRepository, loadSidebar])

  return {
    branches,
    worktrees,
    loading,
    error,
    selectedBranch,
    setSelectedBranch,
    selectedWorktree,
    setSelectedWorktree,
    reload: () => loadSidebar(activeRepository, true),
  }
}
