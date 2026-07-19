import { ConfirmDialog } from '../ui/ConfirmDialog'
import { ErrorDialog } from '../ui/ErrorDialog'
import { PromptDialog } from '../ui/PromptDialog'

interface ErrorDialogState {
  open: boolean
  message: string
  dismiss: () => void
}

interface GitSyncToolbarDialogsProps {
  currentBranch: string
  aheadCount: number
  createOpen: boolean
  stashOpen: boolean
  pushConfirmOpen: boolean
  upstreamPushOpen: boolean
  actionTitle: string
  actionErrorDialog: ErrorDialogState
  onCreateConfirm: (name: string) => void
  onCreateCancel: () => void
  onStashConfirm: (message: string) => void
  onStashCancel: () => void
  onPushConfirm: () => void
  onPushConfirmCancel: () => void
  onUpstreamPushConfirm: () => void
  onUpstreamPushCancel: () => void
  onActionErrorDismiss: () => void
}

export function GitSyncToolbarDialogs({
  currentBranch,
  aheadCount,
  createOpen,
  stashOpen,
  pushConfirmOpen,
  upstreamPushOpen,
  actionTitle,
  actionErrorDialog,
  onCreateConfirm,
  onCreateCancel,
  onStashConfirm,
  onStashCancel,
  onPushConfirm,
  onPushConfirmCancel,
  onUpstreamPushConfirm,
  onUpstreamPushCancel,
  onActionErrorDismiss,
}: GitSyncToolbarDialogsProps) {
  return (
    <>
      <PromptDialog
        open={createOpen}
        title="新規ブランチ"
        message={`作成元: ${currentBranch || 'HEAD'}`}
        label="ブランチ名"
        confirmLabel="OK"
        onConfirm={onCreateConfirm}
        onCancel={onCreateCancel}
      />
      <PromptDialog
        open={stashOpen}
        title="スタッシュに退避"
        message="未コミットの変更（未追跡含む）をスタッシュに退避します。メッセージは任意です。"
        label="メッセージ"
        confirmLabel="退避"
        onConfirm={onStashConfirm}
        onCancel={onStashCancel}
      />
      <ConfirmDialog
        open={pushConfirmOpen}
        title="プッシュの確認"
        message={
          currentBranch
            ? aheadCount > 0
              ? `ブランチ「${currentBranch}」をリモートにプッシュしますか？（${aheadCount} コミット先行）`
              : `ブランチ「${currentBranch}」をリモートにプッシュしますか？`
            : aheadCount > 0
              ? `リモートにプッシュしますか？（${aheadCount} コミット先行）`
              : 'リモートにプッシュしますか？'
        }
        confirmLabel="プッシュ"
        onConfirm={onPushConfirm}
        onCancel={onPushConfirmCancel}
      />
      <ConfirmDialog
        open={upstreamPushOpen}
        title="upstream を設定してプッシュ"
        message={
          currentBranch
            ? `ブランチ「${currentBranch}」に upstream がありません。origin にプッシュして追跡を設定しますか？`
            : 'upstream がありません。origin にプッシュして追跡を設定しますか？'
        }
        confirmLabel="プッシュ"
        onConfirm={onUpstreamPushConfirm}
        onCancel={onUpstreamPushCancel}
      />
      <ErrorDialog
        open={actionErrorDialog.open}
        title={actionTitle}
        message={actionErrorDialog.message}
        onClose={onActionErrorDismiss}
      />
    </>
  )
}
