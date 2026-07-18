import { ConfirmDialog } from '../ui/ConfirmDialog'
import { ContextMenu, type ContextMenuEntry } from '../ui/ContextMenu'
import { ErrorDialog } from '../ui/ErrorDialog'
import { PromptDialog } from '../ui/PromptDialog'
import { WorktreeCheckoutDialog } from '../ui/WorktreeCheckoutDialog'
import { openAppIcon } from '../icons/openAppIcons'
import type { OpenApp, StashEntry, WorktreeEntry } from '../../types'

interface ErrorDialogState {
  open: boolean
  message: string
  dismiss: () => void
}

interface WorktreeMenuState {
  x: number
  y: number
  worktree: WorktreeEntry
}

interface BranchMenuState {
  x: number
  y: number
  items: ContextMenuEntry[]
}

interface StashMenuState {
  x: number
  y: number
  stash: StashEntry
}

interface StashConfirmState {
  kind: 'pop' | 'drop'
  stash: StashEntry
}

interface BranchSidebarDialogsProps {
  loadError: ErrorDialogState
  actionError: ErrorDialogState
  onDismissActionError: () => void
  worktreeError: ErrorDialogState
  onDismissWorktreeError: () => void
  stashError: ErrorDialogState
  onDismissStashError: () => void
  deleteTarget: string | null
  forceDelete: boolean
  onForceDeleteChange: (checked: boolean) => void
  onConfirmDelete: () => void
  onCancelDelete: () => void
  renameTarget: string | null
  onConfirmRename: (value: string) => void
  onCancelRename: () => void
  rebaseTarget: string | null
  rebaseConfirmMessage: string
  onConfirmRebase: () => void
  onCancelRebase: () => void
  mergeTarget: string | null
  mergeConfirmMessage: string
  mergeAllowFastForward: boolean
  onMergeAllowFastForwardChange: (checked: boolean) => void
  onConfirmMerge: () => void
  onCancelMerge: () => void
  removeWorktreeTarget: WorktreeEntry | null
  forceRemoveWorktree: boolean
  onForceRemoveWorktreeChange: (checked: boolean) => void
  onConfirmRemoveWorktree: () => void
  onCancelRemoveWorktree: () => void
  worktreeTargetBranch: string | null
  worktreeDefaultPath: string
  worktreeHint?: string
  onConfirmWorktree: (path: string) => void
  onCancelWorktree: () => void
  worktreeMenu: WorktreeMenuState | null
  onCloseWorktreeMenu: () => void
  openApps?: OpenApp[]
  openAppIconUrls?: Record<string, string>
  onOpenInApp: (appID: string, path: string) => void
  onOpenExplorer: (path: string) => void
  onOpenTerminal: (path: string) => void
  onRequestRemoveWorktree: (worktree: WorktreeEntry) => void
  localMenu: BranchMenuState | null
  onCloseLocalMenu: () => void
  remoteMenu: BranchMenuState | null
  onCloseRemoteMenu: () => void
  stashMenu: StashMenuState | null
  onCloseStashMenu: () => void
  onApplyStash: (stash: StashEntry) => void
  onRequestPopStash: (stash: StashEntry) => void
  onRequestDropStash: (stash: StashEntry) => void
  stashConfirm: StashConfirmState | null
  onConfirmStashAction: () => void
  onCancelStashConfirm: () => void
}

function buildWorktreeMenuItems({
  worktree,
  openApps,
  iconDataUrls,
  onOpenInApp,
  onOpenExplorer,
  onOpenTerminal,
  onRequestRemoveWorktree,
}: {
  worktree: WorktreeEntry
  openApps: OpenApp[]
  iconDataUrls: Record<string, string>
  onOpenInApp: (appID: string, path: string) => void
  onOpenExplorer: (path: string) => void
  onOpenTerminal: (path: string) => void
  onRequestRemoveWorktree: (worktree: WorktreeEntry) => void
}): ContextMenuEntry[] {
  const items: ContextMenuEntry[] = []

  const launchableApps = openApps.filter((app) => app.path.trim() !== '')
  for (const app of launchableApps) {
    const name = app.name.trim() || app.path.trim() || 'アプリ'
    items.push({
      icon: openAppIcon(app.icon, iconDataUrls[app.path.trim()] ?? null),
      label: `${name}で開く`,
      onClick: () => {
        onOpenInApp(app.id, worktree.path)
      },
    })
  }

  if (launchableApps.length > 0) {
    items.push({ type: 'separator' })
  }

  items.push(
    {
      label: 'エクスプローラで開く',
      onClick: () => {
        onOpenExplorer(worktree.path)
      },
    },
    {
      label: 'ターミナルで開く',
      onClick: () => {
        onOpenTerminal(worktree.path)
      },
    },
  )

  if (!worktree.isMain) {
    items.push(
      { type: 'separator' },
      {
        label: 'ワークツリーを削除',
        onClick: () => {
          onRequestRemoveWorktree(worktree)
        },
      },
    )
  }

  return items
}


export function BranchSidebarDialogs({
  loadError,
  actionError,
  onDismissActionError,
  worktreeError,
  onDismissWorktreeError,
  stashError,
  onDismissStashError,
  deleteTarget,
  forceDelete,
  onForceDeleteChange,
  onConfirmDelete,
  onCancelDelete,
  renameTarget,
  onConfirmRename,
  onCancelRename,
  rebaseTarget,
  rebaseConfirmMessage,
  onConfirmRebase,
  onCancelRebase,
  mergeTarget,
  mergeConfirmMessage,
  mergeAllowFastForward,
  onMergeAllowFastForwardChange,
  onConfirmMerge,
  onCancelMerge,
  removeWorktreeTarget,
  forceRemoveWorktree,
  onForceRemoveWorktreeChange,
  onConfirmRemoveWorktree,
  onCancelRemoveWorktree,
  worktreeTargetBranch,
  worktreeDefaultPath,
  worktreeHint,
  onConfirmWorktree,
  onCancelWorktree,
  worktreeMenu,
  onCloseWorktreeMenu,
  openApps = [],
  openAppIconUrls = {},
  onOpenInApp,
  onOpenExplorer,
  onOpenTerminal,
  onRequestRemoveWorktree,
  localMenu,
  onCloseLocalMenu,
  remoteMenu,
  onCloseRemoteMenu,
  stashMenu,
  onCloseStashMenu,
  onApplyStash,
  onRequestPopStash,
  onRequestDropStash,
  stashConfirm,
  onConfirmStashAction,
  onCancelStashConfirm,
}: BranchSidebarDialogsProps) {
  const stashConfirmTitle =
    stashConfirm?.kind === 'pop' ? 'スタッシュを取り出す' : 'スタッシュを削除'
  const stashConfirmMessage = stashConfirm
    ? stashConfirm.kind === 'pop'
      ? `${stashConfirm.stash.ref} を適用して削除しますか？`
      : `${stashConfirm.stash.ref} を削除しますか？（復元できません）`
    : ''

  return (
    <>
      <ErrorDialog
        open={loadError.open}
        title="リポジトリ情報の取得に失敗しました"
        message={loadError.message}
        onClose={loadError.dismiss}
      />
      <ErrorDialog
        open={actionError.open}
        title="ブランチ操作に失敗しました"
        message={actionError.message}
        onClose={onDismissActionError}
      />
      <ErrorDialog
        open={worktreeError.open}
        title="ワークツリー操作に失敗しました"
        message={worktreeError.message}
        onClose={onDismissWorktreeError}
      />
      <ErrorDialog
        open={stashError.open}
        title={
          stashError.message.includes('競合')
            ? 'スタッシュで競合が発生しました'
            : 'スタッシュ操作に失敗しました'
        }
        message={stashError.message}
        onClose={onDismissStashError}
      />
      <ConfirmDialog
        open={deleteTarget !== null}
        title="ブランチを削除"
        message={deleteTarget ? `ブランチ「${deleteTarget}」を削除しますか？` : ''}
        confirmLabel="削除"
        danger
        checkboxLabel="強制削除"
        checked={forceDelete}
        onCheckedChange={onForceDeleteChange}
        onConfirm={onConfirmDelete}
        onCancel={onCancelDelete}
      />
      <PromptDialog
        open={renameTarget !== null}
        title="ブランチ名を変更"
        message={renameTarget ? `現在の名前: ${renameTarget}` : undefined}
        label="新しいブランチ名"
        defaultValue={renameTarget ?? ''}
        confirmLabel="変更"
        onConfirm={onConfirmRename}
        onCancel={onCancelRename}
      />
      <ConfirmDialog
        open={rebaseTarget !== null}
        title="リベースの確認"
        message={rebaseConfirmMessage}
        confirmLabel="リベース"
        onConfirm={onConfirmRebase}
        onCancel={onCancelRebase}
      />
      <ConfirmDialog
        open={mergeTarget !== null}
        title="マージの確認"
        message={mergeConfirmMessage}
        confirmLabel="マージ"
        checkboxLabel="ファストフォワードを許可"
        checked={mergeAllowFastForward}
        onCheckedChange={onMergeAllowFastForwardChange}
        onConfirm={onConfirmMerge}
        onCancel={onCancelMerge}
      />
      <ConfirmDialog
        open={removeWorktreeTarget !== null}
        title="ワークツリーを削除"
        message={
          removeWorktreeTarget
            ? `ワークツリー「${removeWorktreeTarget.path}」を削除しますか？`
            : ''
        }
        confirmLabel="削除"
        danger
        checkboxLabel="強制削除（未コミットの変更を含む）"
        checked={forceRemoveWorktree}
        onCheckedChange={onForceRemoveWorktreeChange}
        onConfirm={onConfirmRemoveWorktree}
        onCancel={onCancelRemoveWorktree}
      />
      <ConfirmDialog
        open={stashConfirm !== null}
        title={stashConfirmTitle}
        message={stashConfirmMessage}
        confirmLabel={stashConfirm?.kind === 'pop' ? '取り出す' : '削除'}
        danger
        onConfirm={onConfirmStashAction}
        onCancel={onCancelStashConfirm}
      />
      <WorktreeCheckoutDialog
        open={worktreeTargetBranch !== null}
        branch={worktreeTargetBranch ?? ''}
        defaultPath={worktreeDefaultPath}
        hint={worktreeHint}
        onConfirm={onConfirmWorktree}
        onCancel={onCancelWorktree}
      />
      {worktreeMenu && (
        <ContextMenu
          x={worktreeMenu.x}
          y={worktreeMenu.y}
          items={buildWorktreeMenuItems({
            worktree: worktreeMenu.worktree,
            openApps,
            iconDataUrls: openAppIconUrls,
            onOpenInApp,
            onOpenExplorer,
            onOpenTerminal,
            onRequestRemoveWorktree,
          })}
          onClose={onCloseWorktreeMenu}
        />
      )}
      {localMenu && (
        <ContextMenu
          x={localMenu.x}
          y={localMenu.y}
          items={localMenu.items}
          onClose={onCloseLocalMenu}
        />
      )}
      {remoteMenu && (
        <ContextMenu
          x={remoteMenu.x}
          y={remoteMenu.y}
          items={remoteMenu.items}
          onClose={onCloseRemoteMenu}
        />
      )}
      {stashMenu && (
        <ContextMenu
          x={stashMenu.x}
          y={stashMenu.y}
          items={[
            {
              label: '適用',
              onClick: () => {
                onApplyStash(stashMenu.stash)
              },
            },
            {
              label: '取り出して削除',
              onClick: () => {
                onRequestPopStash(stashMenu.stash)
              },
            },
            {
              label: '削除',
              onClick: () => {
                onRequestDropStash(stashMenu.stash)
              },
            },
          ]}
          onClose={onCloseStashMenu}
        />
      )}
    </>
  )
}
