import { useCallback, useState } from 'react'

import { MainLayout } from './components/layout/MainLayout'
import { GitWorkspace } from './components/git/GitWorkspace'
import { HistoryView } from './components/git/HistoryView'
import type { CompareRange } from './components/git/CompareDetailPane'
import { SettingsDialog } from './components/settings/SettingsDialog'
import { BranchSidebar } from './components/sidebar/BranchSidebar'
import { RepoTabBar } from './components/tabs/RepoTabBar'
import { GitSyncToolbar } from './components/toolbar/GitSyncToolbar'
import type { MainView } from './components/toolbar/MainViewToolbarTabs'
import { ErrorDialog } from './components/ui/ErrorDialog'
import { useErrorDialog } from './hooks/useErrorDialog'
import { ToastProvider } from './hooks/useToast'
import { useRepoSidebar } from './hooks/useRepoSidebar'
import { useRepoTabs } from './hooks/useRepoTabs'
import { invalidateRepoCaches } from './lib/repoDataCache'
import { prefetchRepo } from './lib/repoPrefetch'
import styles from './App.module.css'

function AppShell() {
  const [mainView, setMainView] = useState<MainView>('files')
  /** 同一 WT 内のコンテンツ変更。remount せず status 等を再同期する。 */
  const [workspaceContentRevision, setWorkspaceContentRevision] = useState(0)
  const [workspaceBusy, setWorkspaceBusy] = useState(false)
  const [toolbarBusy, setToolbarBusy] = useState(false)
  const [sidebarBusy, setSidebarBusy] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [compareRequest, setCompareRequest] = useState<CompareRange | null>(null)
  const handleWorkspaceBusyChange = useCallback((busy: boolean) => {
    setWorkspaceBusy(busy)
  }, [])
  const handleToolbarBusyChange = useCallback((busy: boolean) => {
    setToolbarBusy(busy)
  }, [])
  const handleSidebarBusyChange = useCallback((busy: boolean) => {
    setSidebarBusy(busy)
  }, [])
  const handleCompareRequestConsumed = useCallback(() => {
    setCompareRequest(null)
  }, [])
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
  } = useRepoTabs()

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
    reloadWorktreesMeta,
  } = useRepoSidebar(activeRepository)

  const repoErrorDialog = useErrorDialog(error)

  const worktreePath =
    selectedWorktree ??
    worktrees.find((worktree) => worktree.isMain)?.path ??
    worktrees[0]?.path ??
    ''

  const currentBranch =
    worktrees.find((worktree) => worktree.path === worktreePath)?.branch ??
    selectedBranch ??
    ''

  const compareFromRef = currentBranch !== '' ? currentBranch : null

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

  const handleRefreshBadge = useCallback(async () => {
    if (!worktreePath) {
      return
    }
    await refreshWorktreeBadge(worktreePath)
  }, [refreshWorktreeBadge, worktreePath])

  /** ブランチ切替・stash 等: B + WT meta + W1 + workspace content（全 WT status なし） */
  const handleLightRefresh = useCallback(async () => {
    await Promise.all([reloadBranches(), reloadWorktreesMeta(), handleRefreshBadge()])
    bumpWorkspaceContent()
  }, [bumpWorkspaceContent, handleRefreshBadge, reloadBranches, reloadWorktreesMeta])

  const currentBranchEntry = branches.find(
    (branch) => !branch.isRemote && branch.name === currentBranch,
  )
  const aheadCount = currentBranchEntry?.aheadCount ?? 0
  const behindCount = currentBranchEntry?.behindCount ?? 0
  const hasUpstream = currentBranchEntry?.hasUpstream ?? false
  const pushAfterCommit = activeRepository
    ? (settings.pushAfterCommit?.[activeRepository] ?? false)
    : false

  const handlePushAfterCommitChange = useCallback(
    (enabled: boolean) => {
      if (!activeRepository) {
        return
      }
      void updatePushAfterCommit(activeRepository, enabled)
    },
    [activeRepository, updatePushAfterCommit],
  )

  const handleSyncComplete = async (
    scope: 'sidebar' | 'light' | 'workspace' = 'workspace',
  ) => {
    if (scope === 'sidebar') {
      // Push/Fetch: ahead/behind だけ。全 WT の status はスキップ。
      await reloadBranches()
      return
    }
    if (scope === 'light') {
      // stash 等: B + W1 + workspace content
      await handleLightRefresh()
      return
    }
    // Pull / createBranch / 手動再読込: フル sidebar + workspace 再同期（remount なし）
    await reloadSidebar()
    bumpWorkspaceContent()
  }

  return (
    <>
      <MainLayout
        busy={workspaceBusy || toolbarBusy || sidebarBusy}
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
          loading ? undefined : activeRepository ? (
            <GitSyncToolbar
              worktreePath={worktreePath}
              repositoryPath={activeRepository}
              currentBranch={currentBranch}
              aheadCount={aheadCount}
              behindCount={behindCount}
              hasUpstream={hasUpstream}
              mainView={mainView}
              onMainViewChange={setMainView}
              onActionComplete={handleSyncComplete}
              onReload={handleSyncComplete}
              onBusyChange={handleToolbarBusyChange}
              onOpenSettings={() => setSettingsOpen(true)}
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
              onBusyChange={handleWorkspaceBusyChange}
            />
          ) : (
            <HistoryView
              key={worktreePath}
              worktreePath={worktreePath}
              currentBranch={currentBranch}
              contentRevision={workspaceContentRevision}
              compareRequest={compareRequest}
              onCompareRequestConsumed={handleCompareRequestConsumed}
              onResetComplete={handleSyncComplete}
            />
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
      <SettingsDialog
        open={settingsOpen}
        settings={settings}
        onClose={() => setSettingsOpen(false)}
        onSave={async (next) => {
          await updateSettings(next)
        }}
      />
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
