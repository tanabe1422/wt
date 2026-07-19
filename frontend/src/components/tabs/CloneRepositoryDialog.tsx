import { useEffect, useRef, useState } from 'react'

import { pickDirectory } from '../../lib/wails'
import { joinDir, suggestRepoNameFromUrl } from '../../utils/clonePath'
import { Button } from '../ui/Button'
import styles from '../ui/ConfirmDialog.module.css'

interface CloneRepositoryDialogProps {
  open: boolean
  busy?: boolean
  confirmLabel?: string
  cancelLabel?: string
  onConfirm: (url: string, destPath: string) => void
  onCancel: () => void
}

export function CloneRepositoryDialog({
  open,
  busy = false,
  confirmLabel = 'クローン',
  cancelLabel = 'キャンセル',
  onConfirm,
  onCancel,
}: CloneRepositoryDialogProps) {
  const urlRef = useRef<HTMLInputElement>(null)
  const [url, setUrl] = useState('')
  const [parentDir, setParentDir] = useState('')
  const [destPath, setDestPath] = useState('')
  const [nameTouched, setNameTouched] = useState(false)

  useEffect(() => {
    if (!open) {
      return
    }
    setUrl('')
    setParentDir('')
    setDestPath('')
    setNameTouched(false)
    requestAnimationFrame(() => {
      urlRef.current?.focus()
    })
  }, [open])

  if (!open) {
    return null
  }

  const canSubmit = url.trim().length > 0 && destPath.trim().length > 0 && !busy

  function applySuggestedName(nextUrl: string) {
    if (nameTouched || !parentDir) {
      return
    }
    const name = suggestRepoNameFromUrl(nextUrl)
    if (!name) {
      return
    }
    setDestPath(joinDir(parentDir, name))
  }

  async function handleBrowse() {
    const parent = await pickDirectory()
    if (!parent) {
      return
    }
    const name = suggestRepoNameFromUrl(url) || 'repo'
    setParentDir(parent)
    setNameTouched(false)
    setDestPath(joinDir(parent, name))
  }

  function handleSubmit() {
    if (!canSubmit) {
      return
    }
    onConfirm(url.trim(), destPath.trim())
  }

  return (
    <div className={styles.backdrop} onClick={busy ? undefined : onCancel}>
      <div
        className={styles.dialog}
        role="dialog"
        aria-modal="true"
        aria-labelledby="clone-repo-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className={styles.body}>
          <h2 id="clone-repo-title" className={styles.title}>
            リモートからクローン
          </h2>
          <p className={styles.message}>Git リポジトリの URL と保存先を指定してください。</p>

          <p className={styles.fieldLabel}>リポジトリ URL</p>
          <input
            ref={urlRef}
            className={styles.input}
            type="text"
            value={url}
            placeholder="https://github.com/org/repo.git"
            disabled={busy}
            onChange={(event) => {
              const next = event.target.value
              setUrl(next)
              applySuggestedName(next)
            }}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault()
                handleSubmit()
              }
            }}
          />

          <p className={styles.fieldLabel}>保存先ディレクトリ</p>
          <div className={styles.pathRow}>
            <input
              className={styles.input}
              type="text"
              value={destPath}
              placeholder="C:\\dev\\repo"
              disabled={busy}
              onChange={(event) => {
                setNameTouched(true)
                setDestPath(event.target.value)
              }}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault()
                  handleSubmit()
                }
              }}
            />
            <Button type="button" variant="ghost" disabled={busy} onClick={() => void handleBrowse()}>
              参照…
            </Button>
          </div>
          <p className={styles.hint}>参照で親フォルダを選び、URL からフォルダ名を補完します。</p>
        </div>
        <div className={styles.footer}>
          <Button variant="ghost" disabled={busy} onClick={onCancel}>
            {cancelLabel}
          </Button>
          <Button variant="primary" disabled={!canSubmit} onClick={handleSubmit}>
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  )
}
