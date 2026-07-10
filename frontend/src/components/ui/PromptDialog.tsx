import { useEffect, useRef } from 'react'

import { Button } from './Button'
import styles from './ConfirmDialog.module.css'

interface PromptDialogProps {
  open: boolean
  title: string
  message?: string
  label?: string
  defaultValue?: string
  confirmLabel?: string
  cancelLabel?: string
  onConfirm: (value: string) => void
  onCancel: () => void
}

export function PromptDialog({
  open,
  title,
  message,
  label,
  defaultValue = '',
  confirmLabel = 'OK',
  cancelLabel = 'キャンセル',
  onConfirm,
  onCancel,
}: PromptDialogProps) {
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!open) {
      return
    }
    inputRef.current?.focus()
    inputRef.current?.select()
  }, [open, defaultValue])

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
        aria-labelledby="prompt-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className={styles.body}>
          <h2 id="prompt-title" className={styles.title}>
            {title}
          </h2>
          {message && <p className={styles.message}>{message}</p>}
          {label && <p className={styles.fieldLabel}>{label}</p>}
          <input
            key={open ? 'open' : 'closed'}
            ref={inputRef}
            className={styles.input}
            type="text"
            defaultValue={defaultValue}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault()
                handleSubmit()
              }
            }}
          />
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
