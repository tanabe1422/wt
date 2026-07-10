import { useEffect, useRef } from 'react'

import { Button } from './Button'
import styles from './ConfirmDialog.module.css'

interface WorktreeCheckoutDialogProps {
  open: boolean
  branch: string
  defaultPath: string
  hint?: string
  confirmLabel?: string
  cancelLabel?: string
  onConfirm: (path: string) => void
  onCancel: () => void
}

export function WorktreeCheckoutDialog({
  open,
  branch,
  defaultPath,
  hint,
  confirmLabel = 'OK',
  cancelLabel = 'キャンセル',
  onConfirm,
  onCancel,
}: WorktreeCheckoutDialogProps) {
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!open) {
      return
    }
    inputRef.current?.focus()
    inputRef.current?.select()
  }, [open, defaultPath])

  if (!open) {
    return null
  }

  function handleSubmit() {
    onConfirm(inputRef.current?.value ?? '')
  }

  return (
    <div className={styles.backdrop} onClick={onCancel}>
      <div
        className={styles.dialog}
        role="dialog"
        aria-modal="true"
        aria-labelledby="worktree-checkout-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className={styles.body}>
          <h2 id="worktree-checkout-title" className={styles.title}>
            新しいワークツリーでチェックアウト
          </h2>
          <p className={styles.message}>ブランチ: {branch}</p>
          <p className={styles.fieldLabel}>ディレクトリ</p>
          <input
            key={open ? defaultPath : 'closed'}
            ref={inputRef}
            className={styles.input}
            type="text"
            defaultValue={defaultPath}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault()
                handleSubmit()
              }
            }}
          />
          {hint ? <p className={styles.hint}>{hint}</p> : null}
        </div>
        <div className={styles.footer}>
          <Button variant="ghost" onClick={onCancel}>
            {cancelLabel}
          </Button>
          <Button variant="primary" onClick={handleSubmit}>
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  )
}
