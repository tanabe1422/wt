import { useCallback, useEffect, useMemo, useState } from 'react'
import type { Meta, StoryObj } from '@storybook/react-vite'
import type { MouseEvent } from 'react'

import type { FileStatus } from '../../types'
import type { SectionSelection } from '../../hooks/useSectionSelection'
import { isConflict } from '../../utils/gitStatus'
import { listBranches } from '../../lib/wails'
import { seedMockSyncCounts } from '../../lib/wails/mockApp'
import { SidebarProvider } from '../layout/CollapsibleSidebar'
import { GitSyncToolbar } from '../toolbar/GitSyncToolbar'
import type { MainView } from '../toolbar/MainViewToolbarTabs'
import { ContextMenu } from '../ui/ContextMenu'
import { ChangesPanel } from './ChangesPanel'
import { CommitBar } from './CommitBar'
import { DiffView } from './DiffView'
import workspaceStyles from './GitWorkspace.module.css'

const CONFLICT_PATH = 'src/conflict.ts'

const conflictFile: FileStatus = {
  path: CONFLICT_PATH,
  index: 'U',
  workTree: 'U',
  staged: true,
  isDirectory: false,
}

const resolvedFile: FileStatus = {
  path: CONFLICT_PATH,
  index: ' ',
  workTree: 'M',
  staged: false,
  isDirectory: false,
}

const stagedFile: FileStatus = {
  path: CONFLICT_PATH,
  index: 'M',
  workTree: ' ',
  staged: true,
  isDirectory: false,
}

type RebaseDemoPhase = 'conflict' | 'resolved' | 'staged' | 'completed' | 'pushed'

const PHASE_HINTS: Record<RebaseDemoPhase, string> = {
  conflict:
    '① 競合ファイルを右クリック →「外部ツールで競合を解決」（mergetool の代わりにクリックで解決済みにします）',
  resolved: '② ファイル行の + ボタンでステージ',
  staged: '③ バナーの「続行」を押してリベースを完了',
  completed:
    '④ ツールバーの Push（ahead バッジ）を押す。リベース後は履歴が書き換わるため force push が必要になる場合があります（本番は別 FEATURES）。',
  pushed: '完了: リベース → 競合解決 → push まで一通り体験できました。',
}

const emptySelection: SectionSelection = { paths: new Set(), focus: null, anchor: null }

function selectionFor(path: string | null): SectionSelection {
  if (!path) {
    return emptySelection
  }
  return { paths: new Set([path]), focus: path, anchor: path }
}

function RebaseFlowDemo() {
  const [phase, setPhase] = useState<RebaseDemoPhase>('conflict')
  const [mainView, setMainView] = useState<MainView>('files')
  const [focusPath, setFocusPath] = useState<string | null>(CONFLICT_PATH)
  const [menu, setMenu] = useState<{
    x: number
    y: number
    path: string
    conflict: boolean
  } | null>(null)
  const [aheadCount, setAheadCount] = useState(0)
  const [behindCount] = useState(0)
  const [pushToast, setPushToast] = useState<string | null>(null)

  const { staged, unstaged, repoOperation, conflictCount, canContinueRebase } = useMemo(() => {
    switch (phase) {
      case 'conflict':
        return {
          staged: [] as FileStatus[],
          unstaged: [conflictFile],
          repoOperation: 'rebase' as const,
          conflictCount: 1,
          canContinueRebase: false,
        }
      case 'resolved':
        return {
          staged: [],
          unstaged: [resolvedFile],
          repoOperation: 'rebase' as const,
          conflictCount: 0,
          canContinueRebase: false,
        }
      case 'staged':
        return {
          staged: [stagedFile],
          unstaged: [],
          repoOperation: 'rebase' as const,
          conflictCount: 0,
          canContinueRebase: true,
        }
      case 'completed':
      case 'pushed':
        return {
          staged: [],
          unstaged: [],
          repoOperation: 'none' as const,
          conflictCount: 0,
          canContinueRebase: false,
        }
    }
  }, [phase])

  useEffect(() => {
    if (phase === 'completed') {
      seedMockSyncCounts(3, 0)
      setAheadCount(3)
    }
    if (phase === 'pushed') {
      seedMockSyncCounts(0, 0)
      setAheadCount(0)
    }
  }, [phase])

  const refreshAhead = useCallback(async () => {
    const branches = await listBranches('C:/dev/sample-repo')
    const current = branches.find((entry) => !entry.isRemote && entry.isCurrent)
    if (!current) {
      return
    }
    setAheadCount(current.aheadCount)
    if (phase === 'completed' && current.aheadCount === 0) {
      setPhase('pushed')
      setPushToast('プッシュが完了しました（モック）')
    }
  }, [phase])

  useEffect(() => {
    if (phase !== 'completed') {
      return
    }
    const id = window.setInterval(() => {
      void refreshAhead()
    }, 400)
    return () => window.clearInterval(id)
  }, [phase, refreshAhead])

  const focusEntry =
    [...staged, ...unstaged].find((entry) => entry.path === focusPath) ?? null
  const focusIsConflict = focusEntry ? isConflict(focusEntry) : false
  const focusInStaged = staged.some((entry) => entry.path === focusPath)
  const rebasing = repoOperation === 'rebase'

  const handleResolveConflict = () => {
    setMenu(null)
    setPhase('resolved')
  }

  const handleStage = (path: string) => {
    if (path === CONFLICT_PATH && phase === 'resolved') {
      setPhase('staged')
      setFocusPath(CONFLICT_PATH)
    }
  }

  const handleContinueRebase = () => {
    if (canContinueRebase) {
      setPhase('completed')
      setFocusPath(null)
    }
  }

  const handleAbort = () => {
    setPhase('conflict')
    setFocusPath(CONFLICT_PATH)
    setPushToast(null)
    seedMockSyncCounts(0, 0)
    setAheadCount(0)
  }

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        width: '100%',
        minWidth: 880,
        height: 680,
        border: '1px solid var(--color-slate-200)',
        borderRadius: '0.375rem',
        overflow: 'hidden',
        background: 'var(--color-surface-main)',
      }}
    >
      <div
        style={{
          padding: '0.5rem 0.75rem',
          fontSize: '0.75rem',
          color: 'var(--color-slate-700)',
          background: 'var(--color-slate-100)',
          borderBottom: '1px solid var(--color-slate-200)',
          lineHeight: 1.5,
        }}
      >
        <strong>リベース操作デモ</strong>（feature を main の上に rebase したあとの流れ）
        <br />
        {PHASE_HINTS[phase]}
        {pushToast ? (
          <>
            <br />
            <span style={{ color: 'var(--color-green-700)' }}>{pushToast}</span>
          </>
        ) : null}
      </div>
      <SidebarProvider>
        <GitSyncToolbar
          worktreePath="C:/dev/sample-repo"
          aheadCount={aheadCount}
          behindCount={behindCount}
          hasUpstream
          mainView={mainView}
          onMainViewChange={setMainView}
          onOpenSettings={() => console.info('[story] open settings')}
        />
      </SidebarProvider>
      <div className={workspaceStyles.workspace} style={{ flex: 1, minHeight: 0 }}>
        <div className={workspaceStyles.body}>
          <div className={workspaceStyles.changes}>
            <ChangesPanel
              staged={staged}
              unstaged={unstaged}
              loading={false}
              stagedSelection={selectionFor(focusInStaged ? focusPath : null)}
              unstagedSelection={selectionFor(!focusInStaged ? focusPath : null)}
              repoOperation={repoOperation}
              conflictCount={conflictCount}
              canContinueRebase={canContinueRebase}
              onFileClick={(path) => setFocusPath(path)}
              onFileContextMenu={(entry, event: MouseEvent) => {
                event.preventDefault()
                setMenu({
                  x: event.clientX,
                  y: event.clientY,
                  path: entry.path,
                  conflict: isConflict(entry),
                })
              }}
              onStage={handleStage}
              onUnstage={() => undefined}
              onStageSelected={() => undefined}
              onUnstageSelected={() => undefined}
              onStageAll={() => undefined}
              onUnstageAll={() => undefined}
              onContinueRebase={handleContinueRebase}
              onAbortOperation={rebasing ? handleAbort : undefined}
            />
          </div>
          <div className={workspaceStyles.diff}>
            <DiffView
              file={focusPath}
              diff={focusPath ? { path: focusPath, hunks: [] } : null}
              loading={false}
              error={null}
              staged={focusInStaged}
              conflict={focusIsConflict}
            />
          </div>
        </div>
        <CommitBar
          disabled={rebasing}
          busy={false}
          amendInfo={{
            canAmend: !rebasing,
            reason: rebasing ? 'リベース中は修正できません' : '',
            headMessage: 'feat: add conflict demo',
          }}
          commitBlockReason={
            rebasing ? 'リベース中はバナーの「続行」を使ってください' : null
          }
          pushAfterCommit={false}
          onPushAfterCommitChange={() => undefined}
          onCommit={async () => undefined}
        />
      </div>
      {menu && (
        <ContextMenu
          x={menu.x}
          y={menu.y}
          items={[
            menu.conflict
              ? {
                  label: '外部ツールで競合を解決',
                  onClick: handleResolveConflict,
                }
              : {
                  label: '差分を外部ツールで開く',
                  onClick: () => {
                    console.info('[story] OpenDifftool', menu.path)
                  },
                },
            {
              label: 'エクスプローラーで表示',
              onClick: () => {
                console.info('[story] ShowInExplorer', menu.path)
              },
            },
          ]}
          onClose={() => setMenu(null)}
        />
      )}
    </div>
  )
}

const meta = {
  title: 'Git/RebaseFlow',
  component: RebaseFlowDemo,
  parameters: {
    layout: 'padded',
  },
} satisfies Meta<typeof RebaseFlowDemo>

export default meta
type Story = StoryObj<typeof meta>

export const Interactive: Story = {
  name: 'リベース → 競合解決 → Push',
}
