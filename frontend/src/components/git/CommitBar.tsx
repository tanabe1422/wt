import { useState } from 'react'

import { useErrorDialog } from '../../hooks/useErrorDialog'
import { Button } from '../ui/Button'
import { ErrorDialog } from '../ui/ErrorDialog'
import styles from './CommitBar.module.css'

interface CommitBarProps {
  disabled: boolean
  busy: boolean
  onCommit: (message: string) => Promise<void>
  onPush: () => Promise<void>
}

export function CommitBar({ disabled, busy, onCommit, onPush }: CommitBarProps) {
  const [message, setMessage] = useState('')
  const [actionError, setActionError] = useState<string | null>(null)
  const [actionTitle, setActionTitle] = useState('操作に失敗しました')
  const [acting, setActing] = useState(false)
  const actionErrorDialog = useErrorDialog(actionError)

  const run = async (action: 'commit' | 'push') => {
    setActionError(null)
    setActing(true)
    try {
      if (action === 'commit') {
        await onCommit(message)
        setMessage('')
      } else {
        await onPush()
      }
    } catch (err) {
      setActionTitle(action === 'commit' ? 'コミットに失敗しました' : 'プッシュに失敗しました')
      setActionError(err instanceof Error ? err.message : '操作に失敗しました')
    } finally {
      setActing(false)
    }
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
      <div className={styles.actions}>
        <Button
          type="button"
          className={styles.commitButton}
          disabled={isDisabled || !message.trim()}
          onClick={() => void run('commit')}
        >
          Commit
        </Button>
        <Button
          type="button"
          className={styles.pushButton}
          disabled={isDisabled}
          onClick={() => void run('push')}
        >
          Push
        </Button>
      </div>
      <ErrorDialog
        open={actionErrorDialog.open}
        title={actionTitle}
        message={actionErrorDialog.message}
        onClose={actionErrorDialog.dismiss}
      />
    </div>
  )
}
