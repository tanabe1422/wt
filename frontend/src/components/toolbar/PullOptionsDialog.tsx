import { useEffect, useState } from 'react'

import { Button } from '../ui/Button'
import styles from '../ui/ConfirmDialog.module.css'

export interface PullOptions {
  rebase: boolean
  force: boolean
}

interface PullOptionsDialogProps {
  open: boolean
  onConfirm: (options: PullOptions) => void
  onCancel: () => void
}

export function PullOptionsDialog({ open, onConfirm, onCancel }: PullOptionsDialogProps) {
  const [rebase, setRebase] = useState(false)
  const [force, setForce] = useState(false)

  useEffect(() => {
    if (open) {
      setRebase(false)
      setForce(false)
    }
  }, [open])

  if (!open) {
    return null
  }

  return (
    <div className={styles.backdrop} onClick={onCancel}>
      <div
        className={styles.dialog}
        role="dialog"
        aria-modal="true"
        aria-labelledby="pull-options-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className={styles.body}>
          <h2 id="pull-options-title" className={styles.title}>
            プル
          </h2>
          <p className={styles.message}>リモートの変更を取り込みます。オプションを選択してください。</p>
          <div className={styles.checkboxGroup}>
            <label className={`${styles.checkboxRow}${force ? ` ${styles.checkboxRowDisabled}` : ''}`}>
              <input
                type="checkbox"
                className={styles.checkbox}
                checked={rebase && !force}
                disabled={force}
                onChange={(event) => setRebase(event.target.checked)}
              />
              リベースで取り込む
            </label>
            <label className={styles.choice}>
              <input
                type="checkbox"
                className={styles.choiceInput}
                checked={force}
                onChange={(event) => setForce(event.target.checked)}
              />
              <span className={styles.choiceBody}>
                <span className={styles.choiceLabel}>強制（リモートに合わせる）</span>
                <span className={styles.choiceDescription}>
                  ローカルの先行コミットと未コミットの変更は破棄され、リモート追跡ブランチに完全一致します。
                </span>
              </span>
            </label>
          </div>
        </div>
        <div className={styles.footer}>
          <Button variant="ghost" onClick={onCancel}>
            キャンセル
          </Button>
          <Button
            variant={force ? 'danger' : 'primary'}
            onClick={() => onConfirm({ rebase: force ? false : rebase, force })}
          >
            プル
          </Button>
        </div>
      </div>
    </div>
  )
}
