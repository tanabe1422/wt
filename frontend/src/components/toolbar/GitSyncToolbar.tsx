import { useCallback, useEffect, useState } from 'react'

import { useErrorDialog } from '../../hooks/useErrorDialog'
import type { BusyChangeHandler } from '../../hooks/useBusy'
import { createBranch, fetchRemote, fetchRemotePrune, fetchRemotePriority, getRepoOperationState, pull, pullRebase, push, pushSetUpstream, saveStash, showInExplorer } from '../../lib/wails'
import type { GitOp, ToolbarGitOp } from '../../utils/gitRefreshPolicy'
import { ConfirmDialog } from '../ui/ConfirmDialog'
import { ErrorDialog } from '../ui/ErrorDialog'
import { PromptDialog } from '../ui/PromptDialog'
import { GitBranchIcon, StashIcon } from '../sidebar/BranchIcons'
import { GitSyncActionButton } from './GitSyncActionButton'
import { type GitSyncAction } from './GitSyncIcons'
import { MainViewToolbarTabs, type MainView } from './MainViewToolbarTabs'
import { RemoteCleanupDialog } from './RemoteCleanupDialog'
import { SidebarToggleButton } from './SidebarToggleButton'
import { ToolbarActionButton } from './ToolbarActionButton'
import styles from './GitSyncToolbar.module.css'

/** フェッチの 2 段階: 優先（現行 upstream）→ 裏（全 ref）。 */
export type FetchPhase = 'priority' | 'background'

interface GitSyncToolbarProps {
  worktreePath: string
  repositoryPath?: string
  currentBranch?: string
  disabled?: boolean
  aheadCount?: number
  behindCount?: number
  hasUpstream?: boolean
  mainView: MainView
  onMainViewChange: (view: MainView) => void
  /** 現行 WT の未コミット変更ファイル数（ファイルタブの丸バッジ用） */
  changedFileCount?: number
  /** 操作完了後のリフレッシュ（gitRefreshPolicy の GitOp） */
  onActionComplete?: (op?: GitOp) => void | Promise<void>
  onReload?: () => void | Promise<void>
  onOpenSettings?: () => void
  /** MainLayout busy overlay（fetch / pull / push など同期操作中） */
  onBusyChange?: BusyChangeHandler
  /** フェッチ優先 / 裏フェッチ中。同期ボタン無効・インジケータ表示に使う。 */
  fetchPhase?: FetchPhase | null
  onFetchPhaseChange?: (phase: FetchPhase | null) => void
  /** When true, only show the trailing settings control (no repo selected). */
  settingsOnly?: boolean
}

const syncActions: GitSyncAction[] = ['pull', 'push', 'fetch']

const actionTitles: Record<GitSyncAction, string> = {
  fetch: 'フェッチに失敗しました',
  pull: 'プルに失敗しました',
  push: 'プッシュに失敗しました',
}

const syncOverlayMessages: Record<GitSyncAction, string> = {
  fetch: 'フェッチしています…',
  pull: 'プルしています…',
  push: 'プッシュしています…',
}

function ExplorerIcon({ size = 20 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7z"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinejoin="round"
      />
    </svg>
  )
}

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

function RemoteCleanupIcon({ size = 20 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M4 7h12"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
      <path
        d="M6 7v11a2 2 0 0 0 2 2h4a2 2 0 0 0 2-2V7"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M9 7V5a1 1 0 0 1 1-1h0a1 1 0 0 1 1 1v2"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M15.5 11.5 20 16l-1.5 1.5-4.5-4.5"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M18.5 13.5 20 12l2 2-1.5 1.5"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

async function runSyncAction(action: GitSyncAction, worktreePath: string): Promise<void> {
  if (action === 'pull') {
    await pull(worktreePath)
    return
  }
  await push(worktreePath)
}

export function GitSyncToolbar({
  worktreePath,
  repositoryPath = '',
  currentBranch = '',
  disabled = false,
  aheadCount = 0,
  behindCount = 0,
  hasUpstream = true,
  mainView,
  onMainViewChange,
  changedFileCount = 0,
  onActionComplete,
  onReload,
  onOpenSettings,
  onBusyChange,
  fetchPhase = null,
  onFetchPhaseChange,
  settingsOnly = false,
}: GitSyncToolbarProps) {
  const [actionError, setActionError] = useState<string | null>(null)
  const [actionTitle, setActionTitle] = useState('操作に失敗しました')
  const [acting, setActing] = useState(false)
  const [reloading, setReloading] = useState(false)
  const [createOpen, setCreateOpen] = useState(false)
  const [stashOpen, setStashOpen] = useState(false)
  const [cleanupOpen, setCleanupOpen] = useState(false)
  const [pushConfirmOpen, setPushConfirmOpen] = useState(false)
  const [upstreamPushOpen, setUpstreamPushOpen] = useState(false)
  const actionErrorDialog = useErrorDialog(actionError)

  const setOverlay = useCallback(
    (active: boolean, message?: string) => {
      onBusyChange?.(active, message)
    },
    [onBusyChange],
  )

  useEffect(() => () => onBusyChange?.(false), [onBusyChange])

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

  /** 全画面スピナーは git 操作中だけ。完了後の ahead/behind 再読込は acting を掴まない。 */
  const finishAction = async (op: ToolbarGitOp) => {
    setOverlay(false)
    setActing(false)
    await onActionComplete?.(op)
  }

  const runFetch = async (prune: boolean) => {
    setActionError(null)
    setActing(true)

    const failTitle = prune ? 'フェッチ（prune）に失敗しました' : actionTitles.fetch

    try {
      if (!hasUpstream) {
        setOverlay(true, 'フェッチしています…')
        if (prune) {
          await fetchRemotePrune(worktreePath)
        } else {
          await fetchRemote(worktreePath)
        }
        await finishAction('fetch')
        return
      }

      onFetchPhaseChange?.('priority')
      await fetchRemotePriority(worktreePath)
      setActing(false)
      await onActionComplete?.('fetch')

      onFetchPhaseChange?.('background')
      try {
        if (prune) {
          await fetchRemotePrune(worktreePath)
        } else {
          await fetchRemote(worktreePath)
        }
        await onActionComplete?.('fetch')
      } catch (bgErr) {
        setActionTitle(failTitle)
        setActionError(bgErr instanceof Error ? bgErr.message : failTitle)
      } finally {
        onFetchPhaseChange?.(null)
      }
    } catch (err) {
      setActionTitle(failTitle)
      setActionError(err instanceof Error ? err.message : failTitle)
      setOverlay(false)
      setActing(false)
      onFetchPhaseChange?.(null)
    }
  }

  const runPush = async () => {
    setActionError(null)
    setActing(true)
    setOverlay(true, 'プッシュしています…')
    try {
      await push(worktreePath)
    } catch (err) {
      setActionTitle(actionTitles.push)
      setActionError(err instanceof Error ? err.message : 'プッシュに失敗しました')
    } finally {
      await finishAction('push')
    }
  }

  const run = async (action: GitSyncAction) => {
    if (action === 'fetch') {
      await runFetch(false)
      return
    }
    if (action === 'push') {
      if (!hasUpstream) {
        setUpstreamPushOpen(true)
        return
      }
      setPushConfirmOpen(true)
      return
    }
    setActionError(null)
    setActing(true)
    setOverlay(true, syncOverlayMessages[action])
    try {
      await runSyncAction(action, worktreePath)
    } catch (err) {
      setActionTitle(actionTitles[action])
      setActionError(err instanceof Error ? err.message : '操作に失敗しました')
    } finally {
      // pull は作業ツリーが変わるが、全 WT status は不要（statusBadgeAndBranches）。
      await finishAction(action === 'pull' ? 'pull' : 'fetch')
    }
  }

  const handlePushConfirm = () => {
    setPushConfirmOpen(false)
    void runPush()
  }

  const handlePushSetUpstream = async () => {
    setUpstreamPushOpen(false)
    setActionError(null)
    setActing(true)
    setOverlay(true, 'プッシュしています…')
    try {
      await pushSetUpstream(worktreePath, 'origin')
    } catch (err) {
      setActionTitle(actionTitles.push)
      setActionError(err instanceof Error ? err.message : 'プッシュに失敗しました')
    } finally {
      await finishAction('push')
    }
  }

  const handleFetchPrune = async () => {
    await runFetch(true)
  }

  const handlePullRebase = async () => {
    setActionError(null)
    setActing(true)
    setOverlay(true, 'プルしています…')
    try {
      await pullRebase(worktreePath)
    } catch (err) {
      try {
        const state = await getRepoOperationState(worktreePath)
        if (state.kind !== 'rebase') {
          setActionTitle('プル（rebase）に失敗しました')
          setActionError(err instanceof Error ? err.message : 'プル（rebase）に失敗しました')
        }
      } catch {
        setActionTitle('プル（rebase）に失敗しました')
        setActionError(err instanceof Error ? err.message : 'プル（rebase）に失敗しました')
      }
    } finally {
      await finishAction('pull')
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
    setOverlay(true, 'ブランチを作成しています…')
    try {
      await createBranch(worktreePath, trimmed)
    } catch (err) {
      setActionTitle('ブランチの作成に失敗しました')
      setActionError(err instanceof Error ? err.message : 'ブランチの作成に失敗しました')
    } finally {
      await finishAction('createBranch')
    }
  }

  const handleSaveStash = async (message: string) => {
    setStashOpen(false)
    setActionError(null)
    setActing(true)
    setOverlay(true, 'スタッシュしています…')
    try {
      await saveStash(worktreePath, message, true)
    } catch (err) {
      setActionTitle('スタッシュに失敗しました')
      setActionError(err instanceof Error ? err.message : 'スタッシュに失敗しました')
    } finally {
      await finishAction('saveStash')
    }
  }

  const handleOpenExplorer = async () => {
    if (!worktreePath) {
      return
    }
    try {
      await showInExplorer(worktreePath)
    } catch (err) {
      setActionTitle('エクスプローラーを開けませんでした')
      setActionError(err instanceof Error ? err.message : 'エクスプローラーを開けませんでした')
    }
  }

  const isDisabled = disabled || acting || fetchPhase !== null || !worktreePath

  return (
    <header className={styles.bar}>
      {!settingsOnly ? (
        <div className={styles.leading}>
          <SidebarToggleButton />
          <MainViewToolbarTabs
            view={mainView}
            onChange={onMainViewChange}
            hasFileChanges={changedFileCount > 0}
          />
          <div className={styles.divider} aria-hidden="true" />
          <div className={styles.toolGroup}>
            {syncActions.map((action) => (
              <GitSyncActionButton
                key={action}
                action={action}
                badgeCount={action === 'pull' ? behindCount : action === 'push' ? aheadCount : 0}
                disabled={isDisabled}
                loading={action === 'fetch' && fetchPhase === 'priority'}
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
                    : action === 'pull'
                      ? [
                          {
                            label: 'プル（rebase）',
                            onClick: () => {
                              void handlePullRebase()
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
        {!settingsOnly && (
          <ToolbarActionButton
            label="リモート整理"
            icon={<RemoteCleanupIcon size={20} />}
            disabled={isDisabled}
            onClick={() => setCleanupOpen(true)}
          />
        )}
        {!settingsOnly && (
          <ToolbarActionButton
            label="エクスプローラー"
            icon={<ExplorerIcon size={20} />}
            disabled={isDisabled}
            onClick={() => {
              void handleOpenExplorer()
            }}
          />
        )}
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
      <RemoteCleanupDialog
        open={cleanupOpen}
        repositoryPath={repositoryPath}
        worktreePath={worktreePath}
        onClose={() => setCleanupOpen(false)}
        onDeleted={async () => {
          await onActionComplete?.('fetch')
        }}
      />
      <ConfirmDialog
        open={pushConfirmOpen}
        title="プッシュの確認"
        message={
          currentBranch
            ? aheadCount > 0
              ? `ブランチ「${currentBranch}」をリモートにプッシュしますか？（${aheadCount} コミット先行）`
              : `ブランチ「${currentBranch}」をリモートにプッシュしますか？`
            : aheadCount > 0
              ? `リモートにプッシュしますか？（${aheadCount} コミット先行）`
              : 'リモートにプッシュしますか？'
        }
        confirmLabel="プッシュ"
        onConfirm={handlePushConfirm}
        onCancel={() => setPushConfirmOpen(false)}
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
