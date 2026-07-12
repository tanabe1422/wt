import type { Meta, StoryObj } from '@storybook/react-vite'
import { useState } from 'react'

import { SidebarProvider } from '../layout/CollapsibleSidebar'
import { ToastProvider } from '../../hooks/useToast'
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
    <ToastProvider>
      <SidebarProvider>
        <GitSyncToolbar {...rest} mainView={mainView} onMainViewChange={setMainView} />
      </SidebarProvider>
    </ToastProvider>
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
