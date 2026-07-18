import { Button } from '../ui/Button'
import { IconButton } from '../ui/IconButton'
import styles from './RemoteCleanupDialog.module.css'

function CloseIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M18 6L6 18M6 6l12 12"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  )
}

interface ExcludedListDialogProps {
  open: boolean
  excluded: string[]
  busy: boolean
  onRemove: (name: string) => void
  onClose: () => void
}

export function ExcludedListDialog({
  open,
  excluded,
  busy,
  onRemove,
  onClose,
}: ExcludedListDialogProps) {
  if (!open) {
    return null
  }

  return (
    <div className={styles.backdrop} onClick={onClose}>
      <div
        className={styles.excludedDialog}
        role="dialog"
        aria-modal="true"
        aria-labelledby="excluded-list-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className={styles.header}>
          <h2 id="excluded-list-title">除外リスト</h2>
          <IconButton type="button" aria-label="閉じる" onClick={onClose}>
            <CloseIcon />
          </IconButton>
        </div>
        <div className={styles.excludedBody}>
          <p className={styles.excludedHint}>
            これらのローカルブランチ名に一致するリモートは整理一覧に表示されません。
          </p>
          {excluded.length === 0 ? (
            <p className={styles.empty}>除外中のブランチはありません</p>
          ) : (
            <ul className={styles.excludedList}>
              {excluded.map((name) => (
                <li key={name} className={styles.excludedRow}>
                  <span className={styles.excludedName}>{name}</span>
                  <Button variant="ghost" disabled={busy} onClick={() => onRemove(name)}>
                    削除
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className={styles.footer}>
          <Button variant="ghost" onClick={onClose} disabled={busy}>
            閉じる
          </Button>
        </div>
      </div>
    </div>
  )
}
