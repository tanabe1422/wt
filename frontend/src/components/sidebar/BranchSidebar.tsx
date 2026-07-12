import { useCallback, useMemo, useState } from 'react'

import { useErrorDialog } from '../../hooks/useErrorDialog'
import { useBranchActions } from '../../hooks/useBranchActions'
import { useBranchContextMenu } from '../../hooks/useBranchContextMenu'
import { useStashActions } from '../../hooks/useStashActions'
import { useWorktreeDialogs } from '../../hooks/useWorktreeDialogs'
import type { BranchEntry, WorktreeEntry } from '../../types'
import { collectWorktreeBranches, getSelectedWorktreeBranch } from '../../utils/branchMarks'
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
  onReload: () => void | Promise<void>
  onBranchChanged?: () => void
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
  onBranchChanged,
}: BranchSidebarProps) {
  const errorDialog = useErrorDialog(error)
  const checkedOutBranch = getSelectedWorktreeBranch(worktrees, selectedWorktree)
  const worktreeBranches = useMemo(() => collectWorktreeBranches(worktrees), [worktrees])

  const [deleteTarget, setDeleteTarget] = useState<string | null>(null)
  const [forceDelete, setForceDelete] = useState(false)
  const [renameTarget, setRenameTarget] = useState<string | null>(null)
  const [filterQuery, setFilterQuery] = useState('')

  const handleBranchSuccess = useCallback(async () => {
    await onReload()
    onBranchChanged?.()
  }, [onBranchChanged, onReload])

  const branchActions = useBranchActions({
    worktreePath: selectedWorktree,
    onSuccess: handleBranchSuccess,
  })
  const actionErrorDialog = useErrorDialog(branchActions.error)

  const worktreeDialogs = useWorktreeDialogs({
    activeRepository,
    worktrees,
    selectedWorktree,
    onSelectWorktree,
    onSelectBranch,
    onReload,
    onBranchChanged,
  })
  const worktreeErrorDialog = useErrorDialog(worktreeDialogs.worktreeError)

  const stashActions = useStashActions({
    worktreePath: selectedWorktree,
    reloadToken: `${activeRepository}:${selectedWorktree ?? ''}:${loading ? '1' : '0'}`,
    onSuccess: handleBranchSuccess,
  })

  const localContextMenu = useBranchContextMenu({
    isRemote: false,
    checkedOutBranch,
    worktreeBranches,
    onSwitchLocal: (branch) => {
      void branchActions.switchLocalBranch(branch)
    },
    onCheckoutRemote: () => {},
    onNewWorktree: (branch) => {
      void worktreeDialogs.openWorktreeCheckout(branch, false)
    },
    onMerge: (branch) => {
      void branchActions.merge(branch)
    },
    onSquashMerge: (branch) => {
      void branchActions.squashMerge(branch)
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
    onSwitchLocal: () => {},
    onCheckoutRemote: (remoteRef) => {
      void branchActions.checkoutRemote(remoteRef)
    },
    onNewWorktree: (branch) => {
      void worktreeDialogs.openWorktreeCheckout(branch, true)
    },
  })

  const handleActivateLocal = useCallback(
    (branch: string) => {
      if (branch === checkedOutBranch || branchActions.busy) {
        return
      }
      void branchActions.switchLocalBranch(branch)
    },
    [branchActions, checkedOutBranch],
  )

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

  const handleSelectWorktree = (path: string) => {
    onSelectWorktree(path)
    const worktree = worktrees.find((entry) => entry.path === path)
    if (worktree?.branch) {
      onSelectBranch(worktree.branch)
    }
  }

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

  return (
    <div className={styles.panel}>
      {activeRepository && !loading && !error ? (
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
        ) : loading ? (
          <p className={styles.hint}>読み込み中…</p>
        ) : error ? null : (
          <RepoSidebarContent
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
