import { useEffect, useRef } from 'react'

import type { BusyChangeHandler } from '../../hooks/useBusy'
import { useGitSyncActions, type FetchPhase } from '../../hooks/useGitSyncActions'
import type { GitOp } from '../../utils/gitRefreshPolicy'
import { GitBranchIcon, StashIcon } from '../sidebar/BranchIcons'
import { GitSyncActionButton } from './GitSyncActionButton'
import {
  ExplorerIcon,
  ReloadIcon,
  SettingsIcon,
  type GitSyncAction,
} from './GitSyncIcons'
import { GitSyncToolbarDialogs } from './GitSyncToolbarDialogs'
import { MainViewToolbarTabs, type MainView } from './MainViewToolbarTabs'
import { SidebarToggleButton } from './SidebarToggleButton'
import { ToolbarActionButton } from './ToolbarActionButton'
import styles from './GitSyncToolbar.module.css'

export type { FetchPhase }

interface GitSyncToolbarProps {
  worktreePath: string
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
  /** 変化するたびに新規ブランチダイアログを開く（detached バナーなどから） */
  createBranchRequestKey?: number
}

const syncActions: GitSyncAction[] = ['pull', 'push', 'fetch']

export function GitSyncToolbar({
  worktreePath,
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
  createBranchRequestKey = 0,
}: GitSyncToolbarProps) {
  const {
    acting,
    reloading,
    createOpen,
    setCreateOpen,
    stashOpen,
    setStashOpen,
    pushConfirmOpen,
    setPushConfirmOpen,
    upstreamPushOpen,
    setUpstreamPushOpen,
    actionTitle,
    actionErrorDialog,
    run,
    handleFetchPrune,
    handlePullRebase,
    handleCreateBranch,
    handleSaveStash,
    handleOpenExplorer,
    handlePushConfirm,
    handlePushSetUpstream,
    handleReload,
  } = useGitSyncActions({
    worktreePath,
    hasUpstream,
    onActionComplete,
    onReload,
    onBusyChange,
    onFetchPhaseChange,
  })

  const lastCreateBranchRequestKey = useRef(createBranchRequestKey)
  useEffect(() => {
    if (createBranchRequestKey === lastCreateBranchRequestKey.current) {
      return
    }
    lastCreateBranchRequestKey.current = createBranchRequestKey
    if (createBranchRequestKey > 0) {
      setCreateOpen(true)
    }
  }, [createBranchRequestKey, setCreateOpen])

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
      <GitSyncToolbarDialogs
        currentBranch={currentBranch}
        aheadCount={aheadCount}
        createOpen={createOpen}
        stashOpen={stashOpen}
        pushConfirmOpen={pushConfirmOpen}
        upstreamPushOpen={upstreamPushOpen}
        actionTitle={actionTitle}
        actionErrorDialog={actionErrorDialog}
        onCreateConfirm={(value) => {
          void handleCreateBranch(value)
        }}
        onCreateCancel={() => setCreateOpen(false)}
        onStashConfirm={(value) => {
          void handleSaveStash(value)
        }}
        onStashCancel={() => setStashOpen(false)}
        onPushConfirm={handlePushConfirm}
        onPushConfirmCancel={() => setPushConfirmOpen(false)}
        onUpstreamPushConfirm={() => {
          void handlePushSetUpstream()
        }}
        onUpstreamPushCancel={() => setUpstreamPushOpen(false)}
        onActionErrorDismiss={actionErrorDialog.dismiss}
      />
    </header>
  )
}
