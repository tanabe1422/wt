import styles from './ErrorDialog.module.css'

export interface ErrorDialogItem {
  label: string
  detail?: string
}

interface ErrorDialogProps {
  open: boolean
  title?: string
  message: string
  items?: ErrorDialogItem[]
  confirmLabel?: string
  onClose: () => void
}

export function ErrorDialog({
  open,
  title = 'エラー',
  message,
  items,
  confirmLabel = 'OK',
  onClose,
}: ErrorDialogProps) {
  if (!open) {
    return null
  }

  return (
    <div className={styles.backdrop} onClick={onClose}>
      <div
        className={styles.dialog}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="error-dialog-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className={styles.body}>
          <h2 id="error-dialog-title" className={styles.title}>
            {title}
          </h2>
          <p className={styles.message}>{message}</p>
          {items && items.length > 0 && (
            <ul className={styles.list}>
              {items.map((item) => (
                <li key={item.label} className={styles.listItem}>
                  <span className={styles.listLabel}>{item.label}</span>
                  {item.detail && (
                    <span className={styles.listDetail}>{item.detail}</span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className={styles.footer}>
          <button type="button" className={styles.confirmButton} onClick={onClose}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
