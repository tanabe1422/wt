import { useCallback, useState } from 'react'

import { MainLayout } from './components/layout/MainLayout'
import { GitWorkspace } from './components/git/GitWorkspace'
import { HistoryView } from './components/git/HistoryView'
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
import styles from './App.module.css'

function AppShell() {
  const [mainView, setMainView] = useState<MainView>('files')
  const [workspaceRevision, setWorkspaceRevision] = useState(0)
  const [workspaceBusy, setWorkspaceBusy] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const handleWorkspaceBusyChange = useCallback((busy: boolean) => {
    setWorkspaceBusy(busy)
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
  } = useRepoTabs()

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

  const workspaceKey = `${worktreePath}-${workspaceRevision}`

  const currentBranchEntry = branches.find(
    (branch) => !branch.isRemote && branch.name === currentBranch,
  )
  const aheadCount = currentBranchEntry?.aheadCount ?? 0
  const behindCount = currentBranchEntry?.behindCount ?? 0
  const hasUpstream = currentBranchEntry?.hasUpstream ?? false

  const handleSyncComplete = async () => {
    await reloadSidebar()
    setWorkspaceRevision((value) => value + 1)
  }

  return (
    <>
      <MainLayout
        busy={workspaceBusy}
        toolbar={
          <RepoTabBar
            repositories={repositories}
            activeRepository={activeRepository}
            onActivate={activateRepo}
            onClose={closeRepo}
            onAdd={addRepo}
          />
        }
        workspaceToolbar={
          loading ? undefined : activeRepository ? (
            <GitSyncToolbar
              worktreePath={worktreePath}
              currentBranch={currentBranch}
              aheadCount={aheadCount}
              behindCount={behindCount}
              hasUpstream={hasUpstream}
              mainView={mainView}
              onMainViewChange={setMainView}
              onActionComplete={handleSyncComplete}
              onReload={handleSyncComplete}
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
            onBranchChanged={() => setWorkspaceRevision((value) => value + 1)}
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
              key={workspaceKey}
              worktreePath={worktreePath}
              onSidebarReload={reloadSidebar}
              onBusyChange={handleWorkspaceBusyChange}
            />
          ) : (
            <HistoryView
              key={workspaceKey}
              worktreePath={worktreePath}
              currentBranch={currentBranch}
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
