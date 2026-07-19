import { useEffect, useState } from 'react'

import { Button } from '../ui/Button'
import styles from '../ui/ConfirmDialog.module.css'

export interface PushOptions {
  force: boolean
}

interface PushOptionsDialogProps {
  open: boolean
  currentBranch?: string
  aheadCount?: number
  onConfirm: (options: PushOptions) => void
  onCancel: () => void
}

export function PushOptionsDialog({
  open,
  currentBranch = '',
  aheadCount = 0,
  onConfirm,
  onCancel,
}: PushOptionsDialogProps) {
  const [force, setForce] = useState(false)

  useEffect(() => {
    if (open) {
      setForce(false)
    }
  }, [open])

  if (!open) {
    return null
  }

  const summary = currentBranch
    ? aheadCount > 0
      ? `ブランチ「${currentBranch}」をリモートにプッシュします（${aheadCount} コミット先行）。`
      : `ブランチ「${currentBranch}」をリモートにプッシュします。`
    : aheadCount > 0
      ? `リモートにプッシュします（${aheadCount} コミット先行）。`
      : 'リモートにプッシュします。'

  return (
    <div className={styles.backdrop} onClick={onCancel}>
      <div
        className={styles.dialog}
        role="dialog"
        aria-modal="true"
        aria-labelledby="push-options-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className={styles.body}>
          <h2 id="push-options-title" className={styles.title}>
            プッシュ
          </h2>
          <p className={styles.message}>{summary}</p>
          <div className={styles.checkboxGroup}>
            <label className={styles.choice}>
              <input
                type="checkbox"
                className={styles.choiceInput}
                checked={force}
                onChange={(event) => setForce(event.target.checked)}
              />
              <span className={styles.choiceBody}>
                <span className={styles.choiceLabel}>強制（リモート履歴を上書き）</span>
                <span className={styles.choiceDescription}>
                  リモートのコミット履歴をローカルに合わせて上書きします（--force-with-lease）。他の人が先に
                  push した変更がある場合は拒否されます。
                </span>
              </span>
            </label>
          </div>
        </div>
        <div className={styles.footer}>
          <Button variant="ghost" onClick={onCancel}>
            キャンセル
          </Button>
          <Button variant={force ? 'danger' : 'primary'} onClick={() => onConfirm({ force })}>
            プッシュ
          </Button>
        </div>
      </div>
    </div>
  )
}
