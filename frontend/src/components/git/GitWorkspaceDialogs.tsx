import { ConfirmDialog } from '../ui/ConfirmDialog'
import { ErrorDialog } from '../ui/ErrorDialog'

interface ErrorDialogState {
  open: boolean
  message: string
  dismiss: () => void
}

interface GitWorkspaceDialogsProps {
  confirmOpen: boolean
  confirmTitle: string
  confirmMessage: string
  confirmLabel: string
  onConfirm: () => void
  onCancelConfirm: () => void
  statusError: ErrorDialogState
  diffError: ErrorDialogState
  externalToolError: ErrorDialogState
}

export function GitWorkspaceDialogs({
  confirmOpen,
  confirmTitle,
  confirmMessage,
  confirmLabel,
  onConfirm,
  onCancelConfirm,
  statusError,
  diffError,
  externalToolError,
}: GitWorkspaceDialogsProps) {
  return (
    <>
      <ConfirmDialog
        open={confirmOpen}
        title={confirmTitle}
        message={confirmMessage}
        confirmLabel={confirmLabel}
        danger
        onConfirm={onConfirm}
        onCancel={onCancelConfirm}
      />
      <ErrorDialog
        open={statusError.open}
        title="変更の取得に失敗しました"
        message={statusError.message}
        onClose={statusError.dismiss}
      />
      <ErrorDialog
        open={diffError.open}
        title="差分の取得に失敗しました"
        message={diffError.message}
        onClose={diffError.dismiss}
      />
      <ErrorDialog
        open={externalToolError.open}
        title="外部ツールの起動に失敗しました"
        message={externalToolError.message}
        onClose={externalToolError.dismiss}
      />
    </>
  )
}
