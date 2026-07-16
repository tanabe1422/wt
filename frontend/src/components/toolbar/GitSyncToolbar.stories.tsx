import type { Meta, StoryObj } from '@storybook/react-vite'
import { useCallback, useEffect, useState } from 'react'

import { listBranches } from '../../lib/wails'
import { seedMockSyncCounts } from '../../lib/wails/mockApp'
import { GitWorkspace } from '../git/GitWorkspace'
import { MainLayout } from '../layout/MainLayout'
import { SidebarProvider } from '../layout/CollapsibleSidebar'
import { GitSyncToolbar } from './GitSyncToolbar'
import type { MainView } from './MainViewToolbarTabs'

function InteractiveToolbar(
  props: Omit<React.ComponentProps<typeof GitSyncToolbar>, 'mainView' | 'onMainViewChange'> & {
    initialView?: MainView
  },
) {
  const { initialView = 'files', ...rest } = props
  const [mainView, setMainView] = useState<MainView>(initialView)
  return (
    <SidebarProvider>
      <GitSyncToolbar {...rest} mainView={mainView} onMainViewChange={setMainView} />
    </SidebarProvider>
  )
}

interface SyncBusyDemoProps {
  worktreePath: string
  currentBranch: string
  aheadCount: number
  behindCount: number
  hasUpstream: boolean
  hint: string
}

function SyncBusyDemo({
  worktreePath,
  currentBranch,
  aheadCount: initialAhead,
  behindCount: initialBehind,
  hasUpstream: initialHasUpstream,
  hint,
}: SyncBusyDemoProps) {
  const [mainView, setMainView] = useState<MainView>('files')
  const [busy, setBusy] = useState(false)
  const [aheadCount, setAheadCount] = useState(initialAhead)
  const [behindCount, setBehindCount] = useState(initialBehind)
  const [hasUpstream, setHasUpstream] = useState(initialHasUpstream)

  useEffect(() => {
    seedMockSyncCounts(initialAhead, initialBehind)
    setAheadCount(initialAhead)
    setBehindCount(initialBehind)
    setHasUpstream(initialHasUpstream)
  }, [initialAhead, initialBehind, initialHasUpstream])

  const refreshCounts = useCallback(async () => {
    const branches = await listBranches(worktreePath)
    const current = branches.find((entry) => !entry.isRemote && entry.isCurrent)
    if (!current) {
      return
    }
    setAheadCount(current.aheadCount)
    setBehindCount(current.behindCount)
    setHasUpstream(current.hasUpstream)
  }, [worktreePath])

  return (
    <div
      style={{
        height: 420,
        minHeight: 420,
        border: '1px solid var(--color-slate-200)',
        borderRadius: '0.375rem',
        overflow: 'hidden',
        background: 'var(--color-surface-main)',
      }}
    >
      <MainLayout
        busy={busy}
        workspaceToolbar={
          <GitSyncToolbar
            worktreePath={worktreePath}
            currentBranch={currentBranch}
            aheadCount={aheadCount}
            behindCount={behindCount}
            hasUpstream={hasUpstream}
            mainView={mainView}
            onMainViewChange={setMainView}
            onBusyChange={setBusy}
            onActionComplete={refreshCounts}
            onOpenSettings={() => console.info('[story] open settings')}
          />
        }
        sidebar={
          <div
            style={{
              padding: '0.75rem',
              fontSize: '0.75rem',
              color: 'var(--color-slate-500)',
            }}
          >
            サイドバー（モック）
          </div>
        }
      >
        <div
          style={{
            padding: '1rem',
            fontSize: '0.8125rem',
            color: 'var(--color-slate-500)',
            lineHeight: 1.6,
          }}
        >
          <p style={{ margin: 0 }}>{hint}</p>
          <p style={{ margin: '0.75rem 0 0' }}>
            ahead: {aheadCount} / behind: {behindCount}
            {busy ? ' — ローディング中…' : ''}
          </p>
        </div>
      </MainLayout>
    </div>
  )
}

const meta = {
  title: 'Toolbar/GitSyncToolbar',
  component: GitSyncToolbar,
  render: (args) => <InteractiveToolbar {...args} />,
  args: {
    worktreePath: 'C:/dev/sample-repo',
    currentBranch: 'feature/hoge',
    aheadCount: 0,
    behindCount: 0,
    hasUpstream: true,
    changedFileCount: 0,
    mainView: 'files' as const,
    onMainViewChange: () => {},
    onOpenSettings: () => console.info('[story] open settings'),
  },
  argTypes: {
    aheadCount: { control: { type: 'number', min: 0 } },
    behindCount: { control: { type: 'number', min: 0 } },
    hasUpstream: { control: 'boolean' },
    mainView: {
      control: 'select',
      options: ['files', 'history'] satisfies MainView[],
    },
    onMainViewChange: { table: { disable: true } },
  },
  decorators: [
    (Story) => (
      <div
        style={{
          width: 720,
          border: '1px solid var(--color-slate-200)',
          borderRadius: '0.375rem',
          overflow: 'hidden',
          background: 'var(--color-surface-main)',
        }}
      >
        <Story />
        <div style={{ padding: '1rem', fontSize: '0.8125rem', color: 'var(--color-slate-500)' }}>
          メインコンテンツ領域（モック API で Fetch / Pull / Push / Fetch+prune が動作します）
        </div>
      </div>
    ),
  ],
} satisfies Meta<typeof GitSyncToolbar>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const HistoryView: Story = {
  render: (args) => <InteractiveToolbar {...args} initialView="history" />,
}

export const WithCounts: Story = {
  args: {
    aheadCount: 23,
    behindCount: 5,
  },
}

export const WithFileChanges: Story = {
  name: 'ファイルに変更あり',
  render: (args) => <InteractiveToolbar {...args} initialView="history" />,
  args: {
    changedFileCount: 3,
  },
}

export const AheadOnly: Story = {
  args: {
    aheadCount: 12,
    behindCount: 0,
  },
}

export const BehindOnly: Story = {
  args: {
    aheadCount: 0,
    behindCount: 8,
  },
}

export const NoUpstream: Story = {
  name: 'upstream 未設定',
  args: {
    hasUpstream: false,
    currentBranch: 'feature/new-local',
    aheadCount: 0,
    behindCount: 0,
  },
}

export const LargeCounts: Story = {
  args: {
    aheadCount: 99,
    behindCount: 150,
  },
}

export const Disabled: Story = {
  args: {
    disabled: true,
  },
}

export const NoWorktree: Story = {
  args: {
    worktreePath: '',
  },
}

export const SettingsOnly: Story = {
  name: '設定ボタンのみ',
  args: {
    worktreePath: '',
    settingsOnly: true,
  },
}

export const PushBusy: Story = {
  name: 'Push（ローディング）',
  decorators: [],
  render: () => (
    <SyncBusyDemo
      worktreePath="C:/dev/sample-repo"
      currentBranch="feature/hoge"
      aheadCount={23}
      behindCount={0}
      hasUpstream
      hint="Push → 確認ダイアログで「プッシュ」すると busy オーバーレイが出ます（モックは約 1.2 秒後に ahead を 0 にします）。"
    />
  ),
}

export const PullBusy: Story = {
  name: 'Pull（ローディング）',
  decorators: [],
  render: () => (
    <SyncBusyDemo
      worktreePath="C:/dev/sample-repo"
      currentBranch="feature/hoge"
      aheadCount={0}
      behindCount={5}
      hasUpstream
      hint="Pull を押すと共通の busy オーバーレイが出ます（モックは約 1.2 秒後に behind を 0 にします）。"
    />
  ),
}

function BackgroundFetchDemo({
  worktreePath,
  currentBranch,
  aheadCount,
  behindCount,
  hasUpstream,
}: Omit<SyncBusyDemoProps, 'hint'>) {
  const [mainView, setMainView] = useState<MainView>('files')

  return (
    <div
      style={{
        height: 640,
        minHeight: 640,
        border: '1px solid var(--color-slate-200)',
        borderRadius: '0.375rem',
        overflow: 'hidden',
        background: 'var(--color-surface-main)',
      }}
    >
      <MainLayout
        busy={false}
        workspaceToolbar={
          <GitSyncToolbar
            worktreePath={worktreePath}
            currentBranch={currentBranch}
            aheadCount={aheadCount}
            behindCount={behindCount}
            hasUpstream={hasUpstream}
            mainView={mainView}
            onMainViewChange={setMainView}
            onOpenSettings={() => console.info('[story] open settings')}
          />
        }
        sidebar={
          <div
            style={{
              padding: '0.75rem',
              fontSize: '0.75rem',
              color: 'var(--color-slate-500)',
            }}
          >
            サイドバー（モック）
          </div>
        }
      >
        <GitWorkspace
          worktreePath={worktreePath}
          hasUpstream={hasUpstream}
          pushAfterCommit={false}
          onPushAfterCommitChange={() => undefined}
          backgroundFetching
        />
      </MainLayout>
    </div>
  )
}

export const BackgroundFetch: Story = {
  name: '裏フェッチ中（CommitBar あり）',
  decorators: [],
  parameters: {
    layout: 'fullscreen',
  },
  render: () => (
    <BackgroundFetchDemo
      worktreePath="C:/dev/sample-repo"
      currentBranch="feature/hoge"
      aheadCount={2}
      behindCount={1}
      hasUpstream
    />
  ),
}

export const FullWidth: Story = {
  decorators: [
    (Story) => (
      <div style={{ width: '100%', minWidth: 720 }}>
        <div
          style={{
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
              fontWeight: 600,
              color: 'var(--color-slate-500)',
              background: 'var(--color-slate-200)',
              borderBottom: '1px solid var(--color-slate-200)',
            }}
          >
            RepoTabBar（参考）
          </div>
          <Story />
          <div style={{ display: 'flex', minHeight: 200 }}>
            <div
              style={{
                width: 220,
                padding: '0.75rem',
                fontSize: '0.75rem',
                color: 'var(--color-slate-500)',
                borderRight: '1px solid var(--color-slate-200)',
                background: 'var(--color-surface-main)',
              }}
            >
              サイドバー
            </div>
            <div style={{ flex: 1, padding: '0.75rem', fontSize: '0.8125rem', color: 'var(--color-slate-500)' }}>
              メインコンテンツ
            </div>
          </div>
        </div>
      </div>
    ),
  ],
}
