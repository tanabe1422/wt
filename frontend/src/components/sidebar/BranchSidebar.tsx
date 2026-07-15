import { useCallback, useEffect, useMemo, useState } from 'react'

import type { BusyChangeHandler } from '../../hooks/useBusy'
import { useErrorDialog } from '../../hooks/useErrorDialog'
import { useBranchActions } from '../../hooks/useBranchActions'
import { useBranchContextMenu } from '../../hooks/useBranchContextMenu'
import { useStashActions } from '../../hooks/useStashActions'
import { useToast } from '../../hooks/useToast'
import { useWorktreeDialogs } from '../../hooks/useWorktreeDialogs'
import { getRepoOperationState } from '../../lib/wails'
import type { BranchEntry, WorktreeEntry } from '../../types'
import {
  collectWorktreeBranches,
  findWorktreePathByBranch,
  getSelectedWorktreeBranch,
} from '../../utils/branchMarks'
import { localBranchFromRemote } from '../../utils/branchTree'
import { BranchSidebarDialogs } from './BranchSidebarDialogs'
import { RepoSidebarContent } from './RepoSidebarContent'
import styles from './BranchSidebar.module.css'

interface BranchSidebarProps {
  activeRepository: string
  branches: BranchEntry[]
  worktrees: WorktreeEntry[]
  loading: boolean
  error: string | null
  selectedBranch: string | null
  onSelectBranch: (fullName: string) => void
  selectedWorktree: string | null
  onSelectWorktree: (path: string) => void
  /** フルサイドバー更新（WF: branches + 全 WT status） */
  onReload: () => void | Promise<void>
  /** 軽量更新: branches + 現行 WT バッジ + workspace content */
  onLightRefresh?: () => void | Promise<void>
  /** 同一 WT 内のコンテンツ変更通知（remount しない） */
  onWorkspaceContentChanged?: () => void
  onBusyChange?: BusyChangeHandler
  compareFromRef?: string | null
  onCompareWithCurrent?: (branch: string) => void
}

export function BranchSidebar({
  activeRepository,
  branches,
  worktrees,
  loading,
  error,
  selectedBranch,
  onSelectBranch,
  selectedWorktree,
  onSelectWorktree,
  onReload,
  onLightRefresh,
  onWorkspaceContentChanged,
  onBusyChange,
  compareFromRef,
  onCompareWithCurrent,
}: BranchSidebarProps) {
  const errorDialog = useErrorDialog(error)
  const checkedOutBranch = getSelectedWorktreeBranch(worktrees, selectedWorktree)
  const worktreeBranches = useMemo(() => collectWorktreeBranches(worktrees), [worktrees])
  const actionWorktreePath =
    selectedWorktree ||
    worktrees.find((entry) => entry.isMain)?.path ||
    worktrees[0]?.path ||
    null

  const [deleteTarget, setDeleteTarget] = useState<string | null>(null)
  const [forceDelete, setForceDelete] = useState(false)
  const [renameTarget, setRenameTarget] = useState<string | null>(null)
  const [rebaseTarget, setRebaseTarget] = useState<string | null>(null)
  const [filterQuery, setFilterQuery] = useState('')
  const toast = useToast()

  useEffect(() => {
    setFilterQuery('')
  }, [activeRepository])

  const currentBranchEntry = branches.find((entry) => entry.isCurrent && !entry.isRemote)
  const currentHasUpstream = currentBranchEntry?.hasUpstream ?? false

  const handleLightSuccess = useCallback(async () => {
    if (onLightRefresh) {
      await onLightRefresh()
      return
    }
    await onReload()
    onWorkspaceContentChanged?.()
  }, [onLightRefresh, onReload, onWorkspaceContentChanged])

  const handleStructureSuccess = useCallback(async () => {
    await onReload()
    onWorkspaceContentChanged?.()
  }, [onReload, onWorkspaceContentChanged])

  const branchActions = useBranchActions({
    worktreePath: actionWorktreePath,
    onSuccess: handleLightSuccess,
    onStructureChanged: handleStructureSuccess,
  })
  const actionErrorDialog = useErrorDialog(branchActions.error)

  const worktreeDialogs = useWorktreeDialogs({
    activeRepository,
    worktrees,
    selectedWorktree,
    onSelectWorktree,
    onSelectBranch,
    onReload,
    onBranchChanged: onWorkspaceContentChanged,
  })
  const worktreeErrorDialog = useErrorDialog(worktreeDialogs.worktreeError)

  const stashActions = useStashActions({
    worktreePath: actionWorktreePath,
    reloadToken: `${activeRepository}:${actionWorktreePath ?? ''}`,
    onSuccess: handleLightSuccess,
  })

  const sidebarBusy =
    branchActions.busy || worktreeDialogs.worktreeBusy || stashActions.busy

  useEffect(() => {
    onBusyChange?.(sidebarBusy)
    return () => onBusyChange?.(false)
  }, [onBusyChange, sidebarBusy])

  const handleSelectWorktree = useCallback(
    (path: string) => {
      onSelectWorktree(path)
      const worktree = worktrees.find((entry) => entry.path === path)
      if (worktree?.branch) {
        onSelectBranch(worktree.branch)
      }
    },
    [onSelectBranch, onSelectWorktree, worktrees],
  )

  /** ワークツリー付きならそちらへ、なければ現在 WT でブランチ切替 */
  const handleActivateLocal = useCallback(
    (branch: string) => {
      const worktreePath = findWorktreePathByBranch(worktrees, branch)
      if (worktreePath) {
        if (worktreePath !== selectedWorktree) {
          handleSelectWorktree(worktreePath)
        }
        return
      }
      if (branch === checkedOutBranch || branchActions.busy) {
        return
      }
      void branchActions.switchLocalBranch(branch)
    },
    [
      branchActions,
      checkedOutBranch,
      handleSelectWorktree,
      selectedWorktree,
      worktrees,
    ],
  )

  const localContextMenu = useBranchContextMenu({
    isRemote: false,
    checkedOutBranch,
    worktreeBranches,
    compareFromRef,
    onSwitchLocal: handleActivateLocal,
    onCheckoutRemote: () => {},
    onNewWorktree: (branch) => {
      void worktreeDialogs.openWorktreeCheckout(branch, false)
    },
    onCompareWithCurrent,
    onMerge: (branch) => {
      void branchActions.merge(branch)
    },
    onSquashMerge: (branch) => {
      void (async () => {
        const ok = await branchActions.squashMerge(branch)
        if (ok) {
          toast.success('スカッシュマージしました。コミットしてください。')
        }
      })()
    },
    onRebase: (branch) => {
      setRebaseTarget(branch)
    },
    onRename: (branch) => {
      setRenameTarget(branch)
    },
    onDelete: (branch) => {
      setForceDelete(false)
      setDeleteTarget(branch)
    },
  })

  const remoteContextMenu = useBranchContextMenu({
    isRemote: true,
    checkedOutBranch,
    worktreeBranches,
    compareFromRef,
    onSwitchLocal: () => {},
    onCheckoutRemote: (remoteRef) => {
      void branchActions.checkoutRemote(remoteRef)
    },
    onNewWorktree: (branch) => {
      void worktreeDialogs.openWorktreeCheckout(branch, true)
    },
    onCompareWithCurrent,
    onRebase: (branch) => {
      setRebaseTarget(branch)
    },
  })

  const handleActivateRemote = useCallback(
    (remoteRef: string) => {
      if (branchActions.busy) {
        return
      }
      try {
        if (localBranchFromRemote(remoteRef) === checkedOutBranch) {
          return
        }
      } catch {
        return
      }
      void branchActions.checkoutRemote(remoteRef)
    },
    [branchActions, checkedOutBranch],
  )

  const handleConfirmDelete = () => {
    if (!deleteTarget) {
      return
    }
    const branch = deleteTarget
    setDeleteTarget(null)
    void branchActions.removeBranch(branch, forceDelete)
  }

  const handleConfirmRename = (value: string) => {
    if (!renameTarget) {
      return
    }
    const oldName = renameTarget
    const newName = value.trim()
    setRenameTarget(null)
    if (!newName || newName === oldName) {
      return
    }
    void (async () => {
      const ok = await branchActions.rename(oldName, newName)
      if (ok && selectedBranch === oldName) {
        onSelectBranch(newName)
      }
    })()
  }

  const handleConfirmRebase = () => {
    if (!rebaseTarget || !checkedOutBranch) {
      setRebaseTarget(null)
      return
    }
    const upstream = rebaseTarget
    setRebaseTarget(null)
    void (async () => {
      const ok = await branchActions.rebase(upstream)
      if (!ok || !actionWorktreePath) {
        return
      }
      const state = await getRepoOperationState(actionWorktreePath)
      if (state.kind === 'none') {
        toast.success('リベースが完了しました')
      }
    })()
  }

  const rebaseConfirmMessage = rebaseTarget && checkedOutBranch
    ? [
        `「${checkedOutBranch}」を「${rebaseTarget}」の上にリベースしますか？`,
        currentHasUpstream
          ? 'リモートに push 済みの場合、リベース後は force push が必要になることがあります。'
          : null,
      ]
        .filter(Boolean)
        .join('\n')
    : ''

  return (
    <div className={styles.panel}>
      {activeRepository && !(loading && branches.length === 0 && worktrees.length === 0) && !error ? (
        <div className={styles.filter}>
          <input
            type="search"
            className={styles.filterInput}
            value={filterQuery}
            onChange={(event) => setFilterQuery(event.target.value)}
            placeholder="ブランチ / ワークツリーを検索"
            aria-label="ブランチ / ワークツリーを検索"
          />
        </div>
      ) : null}
      <div className={styles.scroll}>
        {!activeRepository ? (
          <p className={styles.empty}>リポジトリを選択してください</p>
        ) : loading && branches.length === 0 && worktrees.length === 0 ? (
          <p className={styles.hint}>読み込み中…</p>
        ) : error && branches.length === 0 && worktrees.length === 0 ? null : (
          <RepoSidebarContent
            key={activeRepository}
            expansionScope={activeRepository}
            branches={branches}
            worktrees={worktrees}
            stashes={stashActions.stashes}
            selectedBranch={selectedBranch}
            selectedWorktree={selectedWorktree}
            filterQuery={filterQuery}
            onSelectBranch={onSelectBranch}
            onSelectWorktree={handleSelectWorktree}
            onActivateLocal={handleActivateLocal}
            onActivateRemote={handleActivateRemote}
            onLocalContextMenu={localContextMenu.openBranchMenu}
            onRemoteContextMenu={remoteContextMenu.openBranchMenu}
            onWorktreeContextMenu={worktreeDialogs.handleWorktreeContextMenu}
            onStashContextMenu={stashActions.openMenu}
          />
        )}
      </div>
      <BranchSidebarDialogs
        loadError={errorDialog}
        actionError={actionErrorDialog}
        onDismissActionError={() => {
          actionErrorDialog.dismiss()
          branchActions.dismissError()
        }}
        worktreeError={worktreeErrorDialog}
        onDismissWorktreeError={() => {
          worktreeErrorDialog.dismiss()
          worktreeDialogs.setWorktreeError(null)
        }}
        stashError={stashActions.errorDialog}
        onDismissStashError={stashActions.dismissError}
        deleteTarget={deleteTarget}
        forceDelete={forceDelete}
        onForceDeleteChange={setForceDelete}
        onConfirmDelete={handleConfirmDelete}
        onCancelDelete={() => setDeleteTarget(null)}
        renameTarget={renameTarget}
        onConfirmRename={handleConfirmRename}
        onCancelRename={() => setRenameTarget(null)}
        rebaseTarget={rebaseTarget}
        rebaseConfirmMessage={rebaseConfirmMessage}
        onConfirmRebase={handleConfirmRebase}
        onCancelRebase={() => setRebaseTarget(null)}
        removeWorktreeTarget={worktreeDialogs.removeWorktreeTarget}
        forceRemoveWorktree={worktreeDialogs.forceRemoveWorktree}
        onForceRemoveWorktreeChange={worktreeDialogs.setForceRemoveWorktree}
        onConfirmRemoveWorktree={worktreeDialogs.handleConfirmRemoveWorktree}
        onCancelRemoveWorktree={() => {
          worktreeDialogs.setRemoveWorktreeTarget(null)
          worktreeDialogs.setForceRemoveWorktree(false)
        }}
        worktreeTargetBranch={worktreeDialogs.worktreeTarget?.branch ?? null}
        worktreeDefaultPath={worktreeDialogs.worktreeDefaultPath}
        worktreeHint={worktreeDialogs.worktreeHint}
        onConfirmWorktree={worktreeDialogs.handleConfirmWorktree}
        onCancelWorktree={() => worktreeDialogs.setWorktreeTarget(null)}
        worktreeMenu={worktreeDialogs.worktreeMenu}
        onCloseWorktreeMenu={() => worktreeDialogs.setWorktreeMenu(null)}
        onOpenExplorer={worktreeDialogs.openExplorer}
        onOpenTerminal={worktreeDialogs.openWorktreeTerminal}
        onRequestRemoveWorktree={worktreeDialogs.requestRemoveWorktree}
        localMenu={localContextMenu.menu}
        onCloseLocalMenu={localContextMenu.closeMenu}
        remoteMenu={remoteContextMenu.menu}
        onCloseRemoteMenu={remoteContextMenu.closeMenu}
        stashMenu={stashActions.menu}
        onCloseStashMenu={stashActions.closeMenu}
        onApplyStash={(stash) => {
          stashActions.closeMenu()
          stashActions.apply(stash)
        }}
        onRequestPopStash={(stash) => {
          stashActions.closeMenu()
          stashActions.requestPop(stash)
        }}
        onRequestDropStash={(stash) => {
          stashActions.closeMenu()
          stashActions.requestDrop(stash)
        }}
        stashConfirm={stashActions.confirm}
        onConfirmStashAction={stashActions.confirmAction}
        onCancelStashConfirm={stashActions.cancelConfirm}
      />
    </div>
  )
}
