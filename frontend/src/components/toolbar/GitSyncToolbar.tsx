import { useState } from 'react'

import { useErrorDialog } from '../../hooks/useErrorDialog'
import { useToast } from '../../hooks/useToast'
import { createBranch, fetchRemote, fetchRemotePrune, pull, push, pushSetUpstream, saveStash } from '../../lib/wails'
import { ConfirmDialog } from '../ui/ConfirmDialog'
import { ErrorDialog } from '../ui/ErrorDialog'
import { PromptDialog } from '../ui/PromptDialog'
import { GitBranchIcon, StashIcon } from '../sidebar/BranchIcons'
import { GitSyncActionButton } from './GitSyncActionButton'
import { type GitSyncAction } from './GitSyncIcons'
import { MainViewToolbarTabs, type MainView } from './MainViewToolbarTabs'
import { SidebarToggleButton } from './SidebarToggleButton'
import { ToolbarActionButton } from './ToolbarActionButton'
import styles from './GitSyncToolbar.module.css'

interface GitSyncToolbarProps {
  worktreePath: string
  currentBranch?: string
  disabled?: boolean
  aheadCount?: number
  behindCount?: number
  hasUpstream?: boolean
  mainView: MainView
  onMainViewChange: (view: MainView) => void
  onActionComplete?: () => void | Promise<void>
  onReload?: () => void | Promise<void>
  onOpenSettings?: () => void
  /** When true, only show the trailing settings control (no repo selected). */
  settingsOnly?: boolean
}

const syncActions: GitSyncAction[] = ['pull', 'push', 'fetch']

const actionTitles: Record<GitSyncAction, string> = {
  fetch: 'フェッチに失敗しました',
  pull: 'プルに失敗しました',
  push: 'プッシュに失敗しました',
}

const progressMessages = {
  push: 'プッシュしています…',
} as const

const successMessages = {
  push: 'プッシュしました',
} as const

const SYNC_PROGRESS_ID = 'git-sync'

function SettingsIcon({ size = 20 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z"
        stroke="currentColor"
        strokeWidth="1.75"
      />
      <path
        d="M19.4 13.5a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V20a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H4a2 2 0 1 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V4a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9c.26.6.87 1 1.51 1H20a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function ReloadIcon({ size = 20 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M21 12a9 9 0 1 1-2.64-6.36"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
      <path
        d="M21 3v6h-6"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
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
  hasUpstream = true,
  mainView,
  onMainViewChange,
  onActionComplete,
  onReload,
  onOpenSettings,
  settingsOnly = false,
}: GitSyncToolbarProps) {
  const [actionError, setActionError] = useState<string | null>(null)
  const [actionTitle, setActionTitle] = useState('操作に失敗しました')
  const [acting, setActing] = useState(false)
  const [reloading, setReloading] = useState(false)
  const [createOpen, setCreateOpen] = useState(false)
  const [stashOpen, setStashOpen] = useState(false)
  const [upstreamPushOpen, setUpstreamPushOpen] = useState(false)
  const actionErrorDialog = useErrorDialog(actionError)
  const toast = useToast()

  const handleReload = async () => {
    if (!onReload || reloading) {
      return
    }
    setReloading(true)
    try {
      await onReload()
    } finally {
      setReloading(false)
    }
  }

  const run = async (action: GitSyncAction) => {
    if (action === 'push' && !hasUpstream) {
      setUpstreamPushOpen(true)
      return
    }
    const showToast = action === 'push'
    setActionError(null)
    setActing(true)
    if (showToast) {
      toast.progress(SYNC_PROGRESS_ID, progressMessages.push)
    }
    try {
      await runSyncAction(action, worktreePath)
      if (showToast) {
        toast.dismiss(SYNC_PROGRESS_ID)
        toast.success(successMessages.push)
      }
    } catch (err) {
      if (showToast) {
        toast.dismiss(SYNC_PROGRESS_ID)
      }
      setActionTitle(actionTitles[action])
      setActionError(err instanceof Error ? err.message : '操作に失敗しました')
    } finally {
      await onActionComplete?.()
      setActing(false)
    }
  }

  const handlePushSetUpstream = async () => {
    setUpstreamPushOpen(false)
    setActionError(null)
    setActing(true)
    toast.progress(SYNC_PROGRESS_ID, progressMessages.push)
    try {
      await pushSetUpstream(worktreePath, 'origin')
      toast.dismiss(SYNC_PROGRESS_ID)
      toast.success(successMessages.push)
    } catch (err) {
      toast.dismiss(SYNC_PROGRESS_ID)
      setActionTitle(actionTitles.push)
      setActionError(err instanceof Error ? err.message : 'プッシュに失敗しました')
    } finally {
      await onActionComplete?.()
      setActing(false)
    }
  }

  const handleFetchPrune = async () => {
    setActionError(null)
    setActing(true)
    try {
      const pruned = await fetchRemotePrune(worktreePath)
      if (pruned.length > 0) {
        toast.success('削除しました')
      }
    } catch (err) {
      setActionTitle('フェッチ（prune）に失敗しました')
      setActionError(err instanceof Error ? err.message : 'フェッチ（prune）に失敗しました')
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
    toast.progress(SYNC_PROGRESS_ID, 'ブランチを作成しています…')
    try {
      await createBranch(worktreePath, trimmed)
      toast.dismiss(SYNC_PROGRESS_ID)
      toast.success('ブランチを作成しました')
    } catch (err) {
      toast.dismiss(SYNC_PROGRESS_ID)
      setActionTitle('ブランチの作成に失敗しました')
      setActionError(err instanceof Error ? err.message : 'ブランチの作成に失敗しました')
    } finally {
      await onActionComplete?.()
      setActing(false)
    }
  }

  const handleSaveStash = async (message: string) => {
    setStashOpen(false)
    setActionError(null)
    setActing(true)
    toast.progress(SYNC_PROGRESS_ID, 'スタッシュに退避しています…')
    try {
      await saveStash(worktreePath, message, true)
      toast.dismiss(SYNC_PROGRESS_ID)
      toast.success('スタッシュに退避しました')
    } catch (err) {
      toast.dismiss(SYNC_PROGRESS_ID)
      setActionTitle('スタッシュに失敗しました')
      setActionError(err instanceof Error ? err.message : 'スタッシュに失敗しました')
    } finally {
      await onActionComplete?.()
      setActing(false)
    }
  }

  const isDisabled = disabled || acting || !worktreePath

  return (
    <header className={styles.bar}>
      {!settingsOnly ? (
        <div className={styles.leading}>
          <SidebarToggleButton />
          <MainViewToolbarTabs view={mainView} onChange={onMainViewChange} />
          <div className={styles.divider} aria-hidden="true" />
          <div className={styles.toolGroup}>
            {syncActions.map((action) => (
              <GitSyncActionButton
                key={action}
                action={action}
                badgeCount={action === 'pull' ? behindCount : action === 'push' ? aheadCount : 0}
                disabled={isDisabled}
                menuItems={
                  action === 'fetch'
                    ? [
                        {
                          label: 'フェッチして prune',
                          onClick: () => {
                            void handleFetchPrune()
                          },
                        },
                      ]
                    : undefined
                }
                onClick={() => void run(action)}
              />
            ))}
          </div>
          <div className={styles.divider} aria-hidden="true" />
          <div className={styles.toolGroup}>
            <ToolbarActionButton
              label="ブランチ"
              icon={<GitBranchIcon size={20} />}
              disabled={isDisabled}
              onClick={() => setCreateOpen(true)}
            />
            <ToolbarActionButton
              label="スタッシュ"
              icon={<StashIcon size={20} />}
              disabled={isDisabled}
              onClick={() => setStashOpen(true)}
            />
            {onReload && (
              <ToolbarActionButton
                label="再読込"
                icon={<ReloadIcon size={20} />}
                disabled={isDisabled || reloading}
                onClick={() => void handleReload()}
              />
            )}
          </div>
        </div>
      ) : (
        <div className={styles.leading}>
          <SidebarToggleButton />
        </div>
      )}
      <div className={styles.trailing}>
        <ToolbarActionButton
          label="設定"
          icon={<SettingsIcon size={20} />}
          onClick={onOpenSettings}
        />
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
      <PromptDialog
        open={stashOpen}
        title="スタッシュに退避"
        message="未コミットの変更（未追跡含む）をスタッシュに退避します。メッセージは任意です。"
        label="メッセージ"
        confirmLabel="退避"
        onConfirm={(value) => {
          void handleSaveStash(value)
        }}
        onCancel={() => setStashOpen(false)}
      />
      <ConfirmDialog
        open={upstreamPushOpen}
        title="upstream を設定してプッシュ"
        message={
          currentBranch
            ? `ブランチ「${currentBranch}」に upstream がありません。origin にプッシュして追跡を設定しますか？`
            : 'upstream がありません。origin にプッシュして追跡を設定しますか？'
        }
        confirmLabel="プッシュ"
        onConfirm={() => {
          void handlePushSetUpstream()
        }}
        onCancel={() => setUpstreamPushOpen(false)}
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
