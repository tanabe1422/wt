import { useCallback, useRef, useState } from 'react'

import { patchSidebarSelection } from '../lib/repoDataCache'

export function useSidebarSelection(activeRepository: string) {
  const [selectedBranch, setSelectedBranchState] = useState<string | null>(null)
  const [selectedWorktree, setSelectedWorktreeState] = useState<string | null>(null)
  const selectedBranchRef = useRef(selectedBranch)
  const selectedWorktreeRef = useRef(selectedWorktree)

  selectedBranchRef.current = selectedBranch
  selectedWorktreeRef.current = selectedWorktree

  const clearSelection = useCallback(() => {
    setSelectedBranchState(null)
    setSelectedWorktreeState(null)
  }, [])

  const applySelection = useCallback(
    (nextBranch: string | null, nextWorktree: string | null) => {
      setSelectedWorktreeState(nextWorktree)
      setSelectedBranchState(nextBranch)
    },
    [],
  )

  const setSelectedBranch = useCallback(
    (branch: string | null) => {
      setSelectedBranchState(branch)
      if (activeRepository) {
        patchSidebarSelection(activeRepository, branch, selectedWorktree)
      }
    },
    [activeRepository, selectedWorktree],
  )

  const setSelectedWorktreeBase = useCallback(
    (path: string | null) => {
      setSelectedWorktreeState(path)
      if (activeRepository) {
        patchSidebarSelection(activeRepository, selectedBranch, path)
      }
    },
    [activeRepository, selectedBranch],
  )

  return {
    selectedBranch,
    selectedWorktree,
    selectedBranchRef,
    selectedWorktreeRef,
    setSelectedBranchState,
    setSelectedWorktreeState,
    clearSelection,
    applySelection,
    setSelectedBranch,
    setSelectedWorktreeBase,
  }
}

export type SidebarSelectionApi = ReturnType<typeof useSidebarSelection>
