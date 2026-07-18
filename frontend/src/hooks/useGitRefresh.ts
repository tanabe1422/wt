import { useCallback } from 'react'

import {
  refreshActionsFor,
  refreshActionsForOp,
  type GitOp,
  type RefreshActions,
  type RefreshScope,
} from '../utils/gitRefreshPolicy'

export interface UseGitRefreshDeps {
  worktreePath: string
  reloadSidebar: () => void | Promise<void>
  reloadBranches: () => void | Promise<void>
  reloadWorktreesMeta: () => void | Promise<unknown>
  refreshWorktreeBadge: (path: string) => void | Promise<void>
  bumpWorkspaceContent: () => void
}

/**
 * gitRefreshPolicy の RefreshScope / GitOp を、サイドバー・ワークスペース再取得へ配線する。
 */
export function useGitRefresh({
  worktreePath,
  reloadSidebar,
  reloadBranches,
  reloadWorktreesMeta,
  refreshWorktreeBadge,
  bumpWorkspaceContent,
}: UseGitRefreshDeps) {
  const applyRefreshActions = useCallback(
    async (actions: RefreshActions) => {
      if (actions.reloadSidebar) {
        await reloadSidebar()
        if (actions.bumpWorkspaceContent) {
          bumpWorkspaceContent()
        }
        return
      }

      if (actions.bumpWorkspaceContent) {
        bumpWorkspaceContent()
      }

      const loads: Promise<unknown>[] = []
      if (actions.reloadBranches) {
        loads.push(Promise.resolve(reloadBranches()))
      }
      if (actions.reloadWorktreesMeta) {
        loads.push(Promise.resolve(reloadWorktreesMeta()))
      }
      if (loads.length > 0) {
        await Promise.all(loads)
      }

      if (actions.refreshBadge && worktreePath) {
        void refreshWorktreeBadge(worktreePath)
      }
    },
    [
      bumpWorkspaceContent,
      refreshWorktreeBadge,
      reloadBranches,
      reloadSidebar,
      reloadWorktreesMeta,
      worktreePath,
    ],
  )

  const applyRefreshScope = useCallback(
    (scope: RefreshScope, opts?: { skipStatus?: boolean }) =>
      applyRefreshActions(refreshActionsFor(scope, opts)),
    [applyRefreshActions],
  )

  const refreshAfterOp = useCallback(
    (op: GitOp) => applyRefreshActions(refreshActionsForOp(op)),
    [applyRefreshActions],
  )

  return { applyRefreshActions, applyRefreshScope, refreshAfterOp }
}
