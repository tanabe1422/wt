import { useCallback } from 'react'

import { useSidebarData } from './useSidebarData'
import { useSidebarSelection } from './useSidebarSelection'

/** サイドバー用: selection + data の薄いファサード。 */
export function useRepoSidebar(activeRepository: string) {
  const selection = useSidebarSelection(activeRepository)
  const data = useSidebarData(activeRepository, selection)

  const setSelectedWorktree = useCallback(
    (path: string | null) => {
      selection.setSelectedWorktreeBase(path)
      // 切替先のバッジが未取得でもすぐ埋める
      if (path) {
        void data.refreshWorktreeBadge(path)
      }
    },
    [selection.setSelectedWorktreeBase, data.refreshWorktreeBadge],
  )

  return {
    branches: data.branches,
    worktrees: data.worktrees,
    loading: data.loading,
    error: data.error,
    selectedBranch: selection.selectedBranch,
    setSelectedBranch: selection.setSelectedBranch,
    selectedWorktree: selection.selectedWorktree,
    setSelectedWorktree,
    reload: data.reload,
    reloadBranches: data.reloadBranches,
    refreshWorktreeBadge: data.refreshWorktreeBadge,
    refreshWorktreeBadges: data.refreshWorktreeBadges,
    reloadWorktreesMeta: data.reloadWorktreesMeta,
  }
}
