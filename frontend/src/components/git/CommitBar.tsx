import { useEffect, useState } from 'react'

import { useErrorDialog } from '../../hooks/useErrorDialog'
import type { AmendInfo } from '../../types'
import { Button } from '../ui/Button'
import { ConfirmDialog } from '../ui/ConfirmDialog'
import { ErrorDialog } from '../ui/ErrorDialog'
import styles from './CommitBar.module.css'

export interface CommitOptions {
  amend: boolean
}

interface CommitBarProps {
  disabled: boolean
  busy: boolean
  amendInfo: AmendInfo | null
  onCommit: (message: string, options: CommitOptions) => Promise<void>
}

const emptyAmendInfo: AmendInfo = {
  canAmend: false,
  reason: '',
  headMessage: '',
}

export function CommitBar({ disabled, busy, amendInfo, onCommit }: CommitBarProps) {
  const info = amendInfo ?? emptyAmendInfo
  const [message, setMessage] = useState('')
  const [amend, setAmend] = useState(false)
  const [confirmAmendOpen, setConfirmAmendOpen] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)
  const [actionTitle, setActionTitle] = useState('操作に失敗しました')
  const [acting, setActing] = useState(false)
  const actionErrorDialog = useErrorDialog(actionError)

  useEffect(() => {
    if (!info.canAmend && amend) {
      setAmend(false)
    }
  }, [amend, info.canAmend])

  const runCommit = async (useAmend: boolean) => {
    setActionError(null)
    setActing(true)
    try {
      await onCommit(message, { amend: useAmend })
      setMessage('')
      setAmend(false)
    } catch (err) {
      setActionTitle(useAmend ? 'コミットの修正に失敗しました' : 'コミットに失敗しました')
      setActionError(err instanceof Error ? err.message : '操作に失敗しました')
    } finally {
      setActing(false)
    }
  }

  const handleAmendChange = (checked: boolean) => {
    setAmend(checked)
    if (checked && !message.trim() && info.headMessage) {
      setMessage(info.headMessage)
    }
  }

  const handlePrimaryClick = () => {
    if (amend) {
      setConfirmAmendOpen(true)
      return
    }
    void runCommit(false)
  }

  const isDisabled = disabled || busy || acting

  return (
    <div className={styles.bar}>
      <textarea
        className={styles.input}
        placeholder="コミットメッセージ"
        value={message}
        disabled={isDisabled}
        rows={3}
        onChange={(event) => setMessage(event.target.value)}
      />
      <div className={styles.footer}>
        <label
          className={styles.amendLabel}
          title={!info.canAmend && info.reason ? info.reason : undefined}
        >
          <input
            type="checkbox"
            className={styles.amendCheckbox}
            checked={amend}
            disabled={isDisabled || !info.canAmend}
            onChange={(event) => handleAmendChange(event.target.checked)}
          />
          Amend
          {!info.canAmend && info.reason ? (
            <span className={styles.amendHint}>{info.reason}</span>
          ) : null}
        </label>
        <Button
          type="button"
          className={styles.commitButton}
          disabled={isDisabled || !message.trim()}
          onClick={handlePrimaryClick}
        >
          {amend ? 'Amend' : 'Commit'}
        </Button>
      </div>
      <ConfirmDialog
        open={confirmAmendOpen}
        title="コミットを修正"
        message="直前のコミットを書き換えます。元のコミットは履歴から消えます。"
        confirmLabel="修正する"
        danger
        onConfirm={() => {
          setConfirmAmendOpen(false)
          void runCommit(true)
        }}
        onCancel={() => setConfirmAmendOpen(false)}
      />
      <ErrorDialog
        open={actionErrorDialog.open}
        title={actionTitle}
        message={actionErrorDialog.message}
        onClose={actionErrorDialog.dismiss}
      />
    </div>
  )
}
