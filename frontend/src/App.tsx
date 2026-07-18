import { lazy, Suspense, useCallback, useEffect, useState } from 'react'

import { MainLayout } from './components/layout/MainLayout'
import { GitWorkspace } from './components/git/GitWorkspace'
import type { CompareRange } from './components/git/CompareDetailPane'
import { BranchSidebar } from './components/sidebar/BranchSidebar'
import { RepoTabBar } from './components/tabs/RepoTabBar'
import { GitSyncToolbar, type FetchPhase } from './components/toolbar/GitSyncToolbar'
import type { MainView } from './components/toolbar/MainViewToolbarTabs'
import { ErrorDialog } from './components/ui/ErrorDialog'
import { useErrorDialog } from './hooks/useErrorDialog'
import { useGitRefresh } from './hooks/useGitRefresh'
import { ToastProvider } from './hooks/useToast'
import { useRepoSidebar } from './hooks/useRepoSidebar'
import { useRepoTabs } from './hooks/useRepoTabs'
import type { BusyChangeHandler } from './hooks/useBusy'
import { useWindowActivateRefresh } from './hooks/useWindowActivateRefresh'
import { invalidateRepoCaches, setStatusCache } from './lib/repoDataCache'
import { prefetchRepo } from './lib/repoPrefetch'
import { reconcileSelectionAfterMeta } from './lib/sidebarSelection'
import { getStatus, isWailsRuntime } from './lib/wails'
import { isDetachedWorktree, resolveCurrentBranch } from './utils/detachedHead'
import type { GitOp } from './utils/gitRefreshPolicy'
import { EventsOn } from '../wailsjs/runtime/runtime'
import styles from './App.module.css'

const HistoryView = lazy(() =>
  import('./components/git/HistoryView').then((m) => ({ default: m.HistoryView })),
)
const SettingsDialog = lazy(() =>
  import('./components/settings/SettingsDialog').then((m) => ({ default: m.SettingsDialog })),
)
const GitDebugWindow = lazy(() =>
  import('./components/settings/GitDebugWindow').then((m) => ({ default: m.GitDebugWindow })),
)

const GIT_PROGRESS_EVENT = 'git:progress'

interface GitProgressPayload {
  message?: string
}

function AppShell() {
  const [mainView, setMainView] = useState<MainView>('files')
  /** 同一 WT 内のコンテンツ変更。remount せず status 等を再同期する。 */
  const [workspaceContentRevision, setWorkspaceContentRevision] = useState(0)
  /** ウィンドウ復帰時のカレント WT status 再取得（選択維持）。 */
  const [statusRefreshRevision, setStatusRefreshRevision] = useState(0)
  const [workspaceBusy, setWorkspaceBusy] = useState(false)
  const [toolbarBusy, setToolbarBusy] = useState(false)
  const [sidebarBusy, setSidebarBusy] = useState(false)
  const [busyMessage, setBusyMessage] = useState('')
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [gitDebugOpen, setGitDebugOpen] = useState(false)
  const [fetchPhase, setFetchPhase] = useState<FetchPhase | null>(null)
  const [compareRequest, setCompareRequest] = useState<CompareRange | null>(null)
  const [createBranchRequestKey, setCreateBranchRequestKey] = useState(0)
  const handleWorkspaceBusyChange = useCallback<BusyChangeHandler>((busy, message) => {
    setWorkspaceBusy(busy)
    if (busy && message) {
      setBusyMessage(message)
    }
  }, [])
  const handleToolbarBusyChange = useCallback<BusyChangeHandler>((busy, message) => {
    setToolbarBusy(busy)
    if (busy && message) {
      setBusyMessage(message)
    }
  }, [])
  const handleSidebarBusyChange = useCallback<BusyChangeHandler>((busy, message) => {
    setSidebarBusy(busy)
    if (busy && message) {
      setBusyMessage(message)
    }
  }, [])
  const handleCompareRequestConsumed = useCallback(() => {
    setCompareRequest(null)
  }, [])

  const handleFetchPhaseChange = useCallback((phase: FetchPhase | null) => {
    setFetchPhase(phase)
  }, [])

  const overlayBusy = workspaceBusy || toolbarBusy || sidebarBusy

  useEffect(() => {
    if (!isWailsRuntime()) {
      return
    }
    return EventsOn(GIT_PROGRESS_EVENT, (payload: GitProgressPayload) => {
      const message = typeof payload?.message === 'string' ? payload.message.trim() : ''
      if (message) {
        setBusyMessage(message)
      }
    })
  }, [])

  useEffect(() => {
    if (overlayBusy) {
      setBusyMessage((current) => current || '処理中…')
      return
    }
    setBusyMessage('')
  }, [overlayBusy])
  const {
    settings,
    repositories,
    activeRepository,
    loading,
    error,
    activateRepo,
    closeRepo,
    addRepo,
    updateSettings,
    updatePushAfterCommit,
    updateMergeAllowFastForward,
  } = useRepoTabs()

  useEffect(() => {
    setFetchPhase(null)
  }, [activeRepository])

  const handleCloseRepo = useCallback(
    async (path: string) => {
      invalidateRepoCaches(path)
      await closeRepo(path)
    },
    [closeRepo],
  )

  const handlePrefetchRepo = useCallback((path: string) => {
    prefetchRepo(path)
  }, [])

  const {
    branches,
    worktrees,
    loading: sidebarLoading,
    error: sidebarError,
    selectedBranch,
    setSelectedBranch,
    selectedWorktree,
    setSelectedWorktree,
    reload: reloadSidebar,
    reloadBranches,
    refreshWorktreeBadge,
    refreshWorktreeBadges,
    reloadWorktreesMeta,
  } = useRepoSidebar(activeRepository)

  const repoErrorDialog = useErrorDialog(error)

  const worktreePath =
    selectedWorktree ??
    worktrees.find((worktree) => worktree.isMain)?.path ??
    worktrees[0]?.path ??
    ''

  const currentWorktree = worktrees.find((worktree) => worktree.path === worktreePath)
  const isDetached = Boolean(currentWorktree && isDetachedWorktree(currentWorktree))
  const currentBranch = resolveCurrentBranch(currentWorktree, selectedBranch)
  const changedFileCount = currentWorktree?.changedFileCount ?? 0
  const detachedHeadSha = isDetached ? (currentWorktree?.head ?? null) : undefined

  const compareFromRef = currentBranch !== '' ? currentBranch : null

  const handleRequestCreateBranch = useCallback(() => {
    setCreateBranchRequestKey((value) => value + 1)
  }, [])

  const handleCompareWithCurrent = useCallback(
    (branch: string) => {
      if (!compareFromRef) {
        return
      }
      setCompareRequest({ fromRef: compareFromRef, toRef: branch })
      setMainView('history')
    },
    [compareFromRef],
  )

  const bumpWorkspaceContent = useCallback(() => {
    setWorkspaceContentRevision((value) => value + 1)
  }, [])

  const { applyRefreshScope, refreshAfterOp } = useGitRefresh({
    worktreePath,
    reloadSidebar,
    reloadBranches,
    reloadWorktreesMeta,
    refreshWorktreeBadge,
    bumpWorkspaceContent,
  })

  const handleRefreshBadge = useCallback(async () => {
    if (!worktreePath) {
      return
    }
    await refreshWorktreeBadge(worktreePath)
  }, [refreshWorktreeBadge, worktreePath])

  /** フォーカス復帰: カレント WT のローカル変更 + 他 WT バッジは裏で（busy なし） */
  const handleWindowActivate = useCallback(() => {
    if (!activeRepository || !worktreePath || overlayBusy) {
      return
    }
    if (mainView === 'files') {
      setStatusRefreshRevision((value) => value + 1)
    } else {
      void getStatus(worktreePath)
        .then((status) => setStatusCache(worktreePath, status))
        .catch(() => {
          // キャッシュ温存失敗は非致命
        })
    }
    refreshWorktreeBadges()
  }, [
    activeRepository,
    worktreePath,
    overlayBusy,
    mainView,
    refreshWorktreeBadges,
  ])

  useWindowActivateRefresh(handleWindowActivate, Boolean(activeRepository))

  /** ブランチ切替・stash 等: 旧 light / statusBadgeAndBranches */
  const handleLightRefresh = useCallback(
    () => applyRefreshScope('statusBadgeAndBranches'),
    [applyRefreshScope],
  )

  const currentBranchEntry = branches.find(
    (branch) => !branch.isRemote && branch.name === currentBranch,
  )
  const aheadCount = currentBranchEntry?.aheadCount ?? 0
  const behindCount = currentBranchEntry?.behindCount ?? 0
  const hasUpstream = currentBranchEntry?.hasUpstream ?? false
  const pushAfterCommit = activeRepository
    ? (settings.pushAfterCommit?.[activeRepository] ?? false)
    : false
  const mergeAllowFastForward = activeRepository
    ? (settings.mergeAllowFastForward?.[activeRepository] ?? true)
    : true

  const handlePushAfterCommitChange = useCallback(
    (enabled: boolean) => {
      if (!activeRepository) {
        return
      }
      void updatePushAfterCommit(activeRepository, enabled)
    },
    [activeRepository, updatePushAfterCommit],
  )

  const handleMergeAllowFastForwardChange = useCallback(
    (enabled: boolean) => {
      if (!activeRepository) {
        return
      }
      void updateMergeAllowFastForward(activeRepository, enabled)
    },
    [activeRepository, updateMergeAllowFastForward],
  )

  const handleActionComplete = useCallback(
    async (op?: GitOp) => {
      if (!op) {
        await applyRefreshScope('sidebarFull')
        return
      }
      await refreshAfterOp(op)
    },
    [applyRefreshScope, refreshAfterOp],
  )

  const handleResetComplete = useCallback(
    () => applyRefreshScope('sidebarFull'),
    [applyRefreshScope],
  )

  /** 手動再読込: カレント status + バッジ。サイドバーは WT/branch ズレ時のみ選択修正。 */
  const handleManualReload = useCallback(async () => {
    if (!activeRepository) {
      return
    }
    setStatusRefreshRevision((value) => value + 1)
    void handleRefreshBadge()

    const meta = await reloadWorktreesMeta()
    if (!meta) {
      return
    }
    const next = reconcileSelectionAfterMeta(meta, {
      selectedWorktree,
      selectedBranch,
    })
    if (!next) {
      return
    }
    if (next.selectedWorktree !== selectedWorktree) {
      setSelectedWorktree(next.selectedWorktree)
    }
    if (next.selectedBranch !== selectedBranch) {
      setSelectedBranch(next.selectedBranch)
    }
  }, [
    activeRepository,
    handleRefreshBadge,
    reloadWorktreesMeta,
    selectedBranch,
    selectedWorktree,
    setSelectedBranch,
    setSelectedWorktree,
  ])

  return (
    <>
      <MainLayout
        busy={overlayBusy}
        busyMessage={busyMessage}
        toolbar={
          <RepoTabBar
            repositories={repositories}
            activeRepository={activeRepository}
            onActivate={activateRepo}
            onClose={handleCloseRepo}
            onAdd={addRepo}
            onPrefetch={handlePrefetchRepo}
          />
        }
        workspaceToolbar={
          !loading && activeRepository ? (
            <GitSyncToolbar
              worktreePath={worktreePath}
              repositoryPath={activeRepository}
              currentBranch={currentBranch}
              aheadCount={aheadCount}
              behindCount={behindCount}
              hasUpstream={hasUpstream}
              changedFileCount={changedFileCount}
              mainView={mainView}
              onMainViewChange={setMainView}
              onActionComplete={handleActionComplete}
              onReload={handleManualReload}
              onBusyChange={handleToolbarBusyChange}
              fetchPhase={fetchPhase}
              onFetchPhaseChange={handleFetchPhaseChange}
              onOpenSettings={() => setSettingsOpen(true)}
              createBranchRequestKey={createBranchRequestKey}
            />
          ) : (
            <GitSyncToolbar
              worktreePath=""
              mainView={mainView}
              onMainViewChange={setMainView}
              onOpenSettings={() => setSettingsOpen(true)}
              settingsOnly
            />
          )
        }
        sidebar={
          <BranchSidebar
            activeRepository={activeRepository}
            branches={branches}
            worktrees={worktrees}
            loading={sidebarLoading}
            error={sidebarError}
            selectedBranch={selectedBranch}
            onSelectBranch={setSelectedBranch}
            selectedWorktree={selectedWorktree}
            onSelectWorktree={setSelectedWorktree}
            openApps={settings.openApps}
            mergeAllowFastForward={mergeAllowFastForward}
            onMergeAllowFastForwardChange={handleMergeAllowFastForwardChange}
            onReload={reloadSidebar}
            onLightRefresh={handleLightRefresh}
            onWorkspaceContentChanged={bumpWorkspaceContent}
            onBusyChange={handleSidebarBusyChange}
            compareFromRef={compareFromRef}
            onCompareWithCurrent={handleCompareWithCurrent}
          />
        }
      >
        {loading ? (
          <div className={styles.main}>
            <p className={styles.hint}>読み込み中…</p>
          </div>
        ) : activeRepository ? (
          mainView === 'files' ? (
            <GitWorkspace
              key={worktreePath}
              worktreePath={worktreePath}
              hasUpstream={hasUpstream}
              pushAfterCommit={pushAfterCommit}
              onPushAfterCommitChange={handlePushAfterCommitChange}
              onRefreshBadge={handleRefreshBadge}
              onRefreshBranches={reloadBranches}
              contentRevision={workspaceContentRevision}
              statusRevision={statusRefreshRevision}
              onBusyChange={handleWorkspaceBusyChange}
              fetchPhase={fetchPhase}
              detachedHeadSha={detachedHeadSha}
              onCreateBranchFromDetached={handleRequestCreateBranch}
            />
          ) : (
            <Suspense
              fallback={
                <div className={styles.main}>
                  <p className={styles.hint}>読み込み中…</p>
                </div>
              }
            >
              <HistoryView
                key={worktreePath}
                worktreePath={worktreePath}
                currentBranch={currentBranch}
                contentRevision={workspaceContentRevision}
                compareRequest={compareRequest}
                onCompareRequestConsumed={handleCompareRequestConsumed}
                onResetComplete={handleResetComplete}
              />
            </Suspense>
          )
        ) : (
          <div className={styles.main}>
            <div className={styles.empty}>
              <h1 className={styles.title}>wt-manager</h1>
              <p className={styles.hint}>
                右上の + ボタンからローカルの Git リポジトリを追加してください
              </p>
            </div>
          </div>
        )}
      </MainLayout>
      {settingsOpen ? (
        <Suspense fallback={null}>
          <SettingsDialog
            open={settingsOpen}
            settings={settings}
            onClose={() => setSettingsOpen(false)}
            onSave={async (next) => {
              await updateSettings(next)
            }}
            onOpenGitDebug={() => {
              setGitDebugOpen(true)
              setSettingsOpen(false)
            }}
          />
        </Suspense>
      ) : null}
      {gitDebugOpen ? (
        <Suspense fallback={null}>
          <GitDebugWindow open={gitDebugOpen} onClose={() => setGitDebugOpen(false)} />
        </Suspense>
      ) : null}
      <ErrorDialog
        open={repoErrorDialog.open}
        message={repoErrorDialog.message}
        onClose={repoErrorDialog.dismiss}
      />
    </>
  )
}

function App() {
  return (
    <ToastProvider>
      <AppShell />
    </ToastProvider>
  )
}

export default App
