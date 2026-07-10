import { useCallback, useMemo, useState } from 'react'

import { ErrorDialog } from '../ui/ErrorDialog'
import { ConfirmDialog } from '../ui/ConfirmDialog'
import { ContextMenu } from '../ui/ContextMenu'
import { WorktreeCheckoutDialog } from '../ui/WorktreeCheckoutDialog'
import { useErrorDialog } from '../../hooks/useErrorDialog'
import { useBranchActions } from '../../hooks/useBranchActions'
import { useBranchContextMenu } from '../../hooks/useBranchContextMenu'
import { addWorktree, defaultWorktreePath } from '../../lib/wails'
import { errorMessage } from '../../lib/errorMessage'
import type { BranchEntry, WorktreeEntry } from '../../types'
import { collectWorktreeBranches, getSelectedWorktreeBranch } from '../../utils/branchMarks'
import { localBranchFromRemote } from '../../utils/branchTree'
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

interface WorktreeCheckoutTarget {
  branch: string
  isRemote: boolean
}

function worktreePathHint(defaultPath: string, branch: string): string | undefined {
  const leaf = branch.includes('/') ? branch.slice(branch.lastIndexOf('/') + 1) : branch
  const base = defaultPath.replace(/[/\\]+$/, '').split(/[/\\]/).pop() ?? ''
  const escaped = leaf.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const match = base.match(new RegExp(`^${escaped}-(\\d+)$`))
  if (match) {
    return `同名のディレクトリがあるため -${match[1]} を付けています`
  }
  return undefined
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
  const [worktreeTarget, setWorktreeTarget] = useState<WorktreeCheckoutTarget | null>(null)
  const [worktreeDefaultPath, setWorktreeDefaultPath] = useState('')
  const [worktreeHint, setWorktreeHint] = useState<string | undefined>()
  const [worktreeError, setWorktreeError] = useState<string | null>(null)
  const [worktreeBusy, setWorktreeBusy] = useState(false)

  const handleBranchSuccess = useCallback(async () => {
    await onReload()
    onBranchChanged?.()
  }, [onBranchChanged, onReload])

  const branchActions = useBranchActions({
    worktreePath: selectedWorktree,
    onSuccess: handleBranchSuccess,
  })
  const actionErrorDialog = useErrorDialog(branchActions.error)
  const worktreeErrorDialog = useErrorDialog(worktreeError)

  const openWorktreeCheckout = useCallback(
    async (branch: string, isRemote: boolean) => {
      if (!activeRepository || worktreeBusy) {
        return
      }
      setWorktreeError(null)
      try {
        const pathBranch = isRemote ? localBranchFromRemote(branch) : branch
        const path = await defaultWorktreePath(activeRepository, pathBranch)
        setWorktreeDefaultPath(path)
        setWorktreeHint(worktreePathHint(path, pathBranch))
        setWorktreeTarget({ branch, isRemote })
      } catch (err) {
        setWorktreeError(errorMessage(err, 'デフォルトパスの取得に失敗しました'))
      }
    },
    [activeRepository, worktreeBusy],
  )

  const localContextMenu = useBranchContextMenu({
    isRemote: false,
    checkedOutBranch,
    worktreeBranches,
    onSwitchLocal: (branch) => {
      void branchActions.switchLocalBranch(branch)
    },
    onCheckoutRemote: () => {},
    onNewWorktree: (branch) => {
      void openWorktreeCheckout(branch, false)
    },
    onMerge: (branch) => {
      void branchActions.merge(branch)
    },
    onSquashMerge: (branch) => {
      void branchActions.squashMerge(branch)
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
      void openWorktreeCheckout(branch, true)
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

  const handleConfirmWorktree = (path: string) => {
    if (!worktreeTarget || !activeRepository || worktreeBusy) {
      return
    }
    const trimmed = path.trim()
    if (!trimmed) {
      setWorktreeError('パスが空です')
      return
    }

    const { branch, isRemote } = worktreeTarget
    setWorktreeTarget(null)
    setWorktreeBusy(true)
    setWorktreeError(null)

    void (async () => {
      try {
        const createdPath = await addWorktree(activeRepository, trimmed, branch, isRemote)
        await onReload()
        onSelectWorktree(createdPath)
        const localName = isRemote ? localBranchFromRemote(branch) : branch
        onSelectBranch(localName)
        onBranchChanged?.()
      } catch (err) {
        setWorktreeError(errorMessage(err, 'ワークツリーの作成に失敗しました'))
      } finally {
        setWorktreeBusy(false)
      }
    })()
  }

  return (
    <div className={styles.panel}>
      <div className={styles.scroll}>
        {!activeRepository ? (
          <p className={styles.empty}>リポジトリを選択してください</p>
        ) : loading ? (
          <p className={styles.hint}>読み込み中…</p>
        ) : error ? null : (
          <RepoSidebarContent
            branches={branches}
            worktrees={worktrees}
            selectedBranch={selectedBranch}
            selectedWorktree={selectedWorktree}
            onSelectBranch={onSelectBranch}
            onSelectWorktree={handleSelectWorktree}
            onActivateLocal={handleActivateLocal}
            onActivateRemote={handleActivateRemote}
            onLocalContextMenu={localContextMenu.openBranchMenu}
            onRemoteContextMenu={remoteContextMenu.openBranchMenu}
          />
        )}
      </div>
      <ErrorDialog
        open={errorDialog.open}
        title="リポジトリ情報の取得に失敗しました"
        message={errorDialog.message}
        onClose={errorDialog.dismiss}
      />
      <ErrorDialog
        open={actionErrorDialog.open}
        title="ブランチ操作に失敗しました"
        message={actionErrorDialog.message}
        onClose={() => {
          actionErrorDialog.dismiss()
          branchActions.dismissError()
        }}
      />
      <ErrorDialog
        open={worktreeErrorDialog.open}
        title="ワークツリー操作に失敗しました"
        message={worktreeErrorDialog.message}
        onClose={() => {
          worktreeErrorDialog.dismiss()
          setWorktreeError(null)
        }}
      />
      <ConfirmDialog
        open={deleteTarget !== null}
        title="ブランチを削除"
        message={
          deleteTarget
            ? `ブランチ「${deleteTarget}」を削除しますか？`
            : ''
        }
        confirmLabel="削除"
        danger
        checkboxLabel="強制削除"
        checked={forceDelete}
        onCheckedChange={setForceDelete}
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
      <WorktreeCheckoutDialog
        open={worktreeTarget !== null}
        branch={worktreeTarget?.branch ?? ''}
        defaultPath={worktreeDefaultPath}
        hint={worktreeHint}
        onConfirm={handleConfirmWorktree}
        onCancel={() => setWorktreeTarget(null)}
      />
      {localContextMenu.menu && (
        <ContextMenu
          x={localContextMenu.menu.x}
          y={localContextMenu.menu.y}
          items={localContextMenu.menu.items}
          onClose={localContextMenu.closeMenu}
        />
      )}
      {remoteContextMenu.menu && (
        <ContextMenu
          x={remoteContextMenu.menu.x}
          y={remoteContextMenu.menu.y}
          items={remoteContextMenu.menu.items}
          onClose={remoteContextMenu.closeMenu}
        />
      )}
    </div>
  )
}
