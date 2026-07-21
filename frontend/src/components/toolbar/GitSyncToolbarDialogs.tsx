import { ConfirmDialog } from '../ui/ConfirmDialog'
import { ErrorDialog } from '../ui/ErrorDialog'
import { PromptDialog } from '../ui/PromptDialog'
import { PullOptionsDialog, type PullOptions } from './PullOptionsDialog'
import { PushOptionsDialog, type PushOptions } from './PushOptionsDialog'

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
  pushOpen: boolean
  pushForceConfirmOpen: boolean
  upstreamPushOpen: boolean
  pullOpen: boolean
  pullForceConfirmOpen: boolean
  resetConfirmOpen: boolean
  actionTitle: string
  actionErrorDialog: ErrorDialogState
  onCreateConfirm: (name: string) => void
  onCreateCancel: () => void
  onStashConfirm: (message: string) => void
  onStashCancel: () => void
  onPushConfirm: (options: PushOptions) => void
  onPushCancel: () => void
  onPushForceConfirm: () => void
  onPushForceConfirmCancel: () => void
  onUpstreamPushConfirm: () => void
  onUpstreamPushCancel: () => void
  onPullConfirm: (options: PullOptions) => void
  onPullCancel: () => void
  onPullForceConfirm: () => void
  onPullForceConfirmCancel: () => void
  onResetConfirm: () => void
  onResetCancel: () => void
  onActionErrorDismiss: () => void
}

export function GitSyncToolbarDialogs({
  currentBranch,
  aheadCount,
  createOpen,
  stashOpen,
  pushOpen,
  pushForceConfirmOpen,
  upstreamPushOpen,
  pullOpen,
  pullForceConfirmOpen,
  resetConfirmOpen,
  actionTitle,
  actionErrorDialog,
  onCreateConfirm,
  onCreateCancel,
  onStashConfirm,
  onStashCancel,
  onPushConfirm,
  onPushCancel,
  onPushForceConfirm,
  onPushForceConfirmCancel,
  onUpstreamPushConfirm,
  onUpstreamPushCancel,
  onPullConfirm,
  onPullCancel,
  onPullForceConfirm,
  onPullForceConfirmCancel,
  onResetConfirm,
  onResetCancel,
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
      <PullOptionsDialog open={pullOpen} onConfirm={onPullConfirm} onCancel={onPullCancel} />
      <ConfirmDialog
        open={pullForceConfirmOpen}
        title="強制プルの確認"
        message={
          currentBranch
            ? `ブランチ「${currentBranch}」をリモート追跡ブランチに完全一致させます。ローカルの先行コミットと未コミットの変更は破棄されます。よろしいですか？`
            : 'リモート追跡ブランチに完全一致させます。ローカルの先行コミットと未コミットの変更は破棄されます。よろしいですか？'
        }
        confirmLabel="強制プル"
        danger
        onConfirm={onPullForceConfirm}
        onCancel={onPullForceConfirmCancel}
      />
      <ConfirmDialog
        open={resetConfirmOpen}
        title="ワーキングツリーをリセット"
        message="ステージ済み・未ステージの変更と未追跡ファイルをすべて破棄します。この操作は取り消せません。"
        confirmLabel="リセット"
        danger
        onConfirm={onResetConfirm}
        onCancel={onResetCancel}
      />
      <PushOptionsDialog
        open={pushOpen}
        currentBranch={currentBranch}
        aheadCount={aheadCount}
        onConfirm={onPushConfirm}
        onCancel={onPushCancel}
      />
      <ConfirmDialog
        open={pushForceConfirmOpen}
        title="強制プッシュの確認"
        message={
          currentBranch
            ? `ブランチ「${currentBranch}」を強制プッシュします。リモートの履歴が上書きされます。よろしいですか？`
            : '強制プッシュします。リモートの履歴が上書きされます。よろしいですか？'
        }
        confirmLabel="強制プッシュ"
        danger
        onConfirm={onPushForceConfirm}
        onCancel={onPushForceConfirmCancel}
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
