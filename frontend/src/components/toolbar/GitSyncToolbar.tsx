import { useState } from 'react'

import { useErrorDialog } from '../../hooks/useErrorDialog'
import { createBranch, fetchRemote, pull, push } from '../../lib/wails'
import { ErrorDialog } from '../ui/ErrorDialog'
import { PromptDialog } from '../ui/PromptDialog'
import { GitBranchIcon } from '../sidebar/BranchIcons'
import { GitSyncActionButton } from './GitSyncActionButton'
import { type GitSyncAction } from './GitSyncIcons'
import { MainViewToolbarTabs, type MainView } from './MainViewToolbarTabs'
import { ToolbarActionButton } from './ToolbarActionButton'
import styles from './GitSyncToolbar.module.css'

interface GitSyncToolbarProps {
  worktreePath: string
  currentBranch?: string
  disabled?: boolean
  aheadCount?: number
  behindCount?: number
  mainView: MainView
  onMainViewChange: (view: MainView) => void
  onActionComplete?: () => void | Promise<void>
}

const syncActions: GitSyncAction[] = ['pull', 'push', 'fetch']

const actionTitles: Record<GitSyncAction, string> = {
  fetch: 'フェッチに失敗しました',
  pull: 'プルに失敗しました',
  push: 'プッシュに失敗しました',
}

async function runSyncAction(action: GitSyncAction, worktreePath: string): Promise<void> {
  if (action === 'fetch') {
    await fetchRemote(worktreePath)
    return
  }
  if (action === 'pull') {
    await pull(worktreePath)
    return
  }
  await push(worktreePath)
}

export function GitSyncToolbar({
  worktreePath,
  currentBranch = '',
  disabled = false,
  aheadCount = 0,
  behindCount = 0,
  mainView,
  onMainViewChange,
  onActionComplete,
}: GitSyncToolbarProps) {
  const [actionError, setActionError] = useState<string | null>(null)
  const [actionTitle, setActionTitle] = useState('操作に失敗しました')
  const [acting, setActing] = useState(false)
  const [createOpen, setCreateOpen] = useState(false)
  const actionErrorDialog = useErrorDialog(actionError)

  const run = async (action: GitSyncAction) => {
    setActionError(null)
    setActing(true)
    try {
      await runSyncAction(action, worktreePath)
    } catch (err) {
      setActionTitle(actionTitles[action])
      setActionError(err instanceof Error ? err.message : '操作に失敗しました')
    } finally {
      await onActionComplete?.()
      setActing(false)
    }
  }

  const handleCreateBranch = async (name: string) => {
    const trimmed = name.trim()
    if (!trimmed) {
      return
    }
    setCreateOpen(false)
    setActionError(null)
    setActing(true)
    try {
      await createBranch(worktreePath, trimmed)
    } catch (err) {
      setActionTitle('ブランチの作成に失敗しました')
      setActionError(err instanceof Error ? err.message : 'ブランチの作成に失敗しました')
    } finally {
      await onActionComplete?.()
      setActing(false)
    }
  }

  const isDisabled = disabled || acting || !worktreePath

  return (
    <header className={styles.bar}>
      <div className={styles.leading}>
        <MainViewToolbarTabs view={mainView} onChange={onMainViewChange} />
        <div className={styles.divider} aria-hidden="true" />
        <div className={styles.toolGroup}>
          {syncActions.map((action) => (
            <GitSyncActionButton
              key={action}
              action={action}
              badgeCount={action === 'pull' ? behindCount : action === 'push' ? aheadCount : 0}
              disabled={isDisabled}
              onClick={() => void run(action)}
            />
          ))}
          <ToolbarActionButton
            label="ブランチ"
            icon={<GitBranchIcon size={20} />}
            disabled={isDisabled}
            onClick={() => setCreateOpen(true)}
          />
        </div>
      </div>
      <PromptDialog
        open={createOpen}
        title="新規ブランチ"
        message={`作成元: ${currentBranch || 'HEAD'}`}
        label="ブランチ名"
        confirmLabel="OK"
        onConfirm={(value) => {
          void handleCreateBranch(value)
        }}
        onCancel={() => setCreateOpen(false)}
      />
      <ErrorDialog
        open={actionErrorDialog.open}
        title={actionTitle}
        message={actionErrorDialog.message}
        onClose={actionErrorDialog.dismiss}
      />
    </header>
  )
}
