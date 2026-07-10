import type { Meta, StoryObj } from '@storybook/react-vite'

import { GitSyncActionButton } from './GitSyncActionButton'
import type { GitSyncAction } from './GitSyncIcons'

const ACTIONS: GitSyncAction[] = ['pull', 'push', 'fetch']

const meta = {
  title: 'Toolbar/GitSyncActionButton',
  component: GitSyncActionButton,
  args: {
    action: 'pull' as const,
    badgeCount: 0,
  },
  argTypes: {
    action: {
      control: 'select',
      options: ACTIONS,
    },
    badgeCount: {
      control: { type: 'number', min: 0 },
    },
  },
} satisfies Meta<typeof GitSyncActionButton>

export default meta
type Story = StoryObj<typeof meta>

export const Pull: Story = {
  args: { action: 'pull' },
}

export const PullWithBadge: Story = {
  args: { action: 'pull', badgeCount: 5 },
}

export const Push: Story = {
  args: { action: 'push' },
}

export const PushWithBadge: Story = {
  args: { action: 'push', badgeCount: 23 },
}

export const Fetch: Story = {
  args: { action: 'fetch' },
}

export const Disabled: Story = {
  args: { action: 'pull', disabled: true },
}

export const AllActions: Story = {
  render: () => (
    <div
      style={{
        display: 'flex',
        gap: '0.125rem',
        padding: '0.5rem 0.75rem',
        background: 'var(--color-surface-header)',
        border: '1px solid var(--color-slate-200)',
        borderRadius: '0.375rem',
        width: 'fit-content',
      }}
    >
      <GitSyncActionButton action="pull" badgeCount={5} />
      <GitSyncActionButton action="push" badgeCount={23} />
      <GitSyncActionButton action="fetch" />
    </div>
  ),
}

export const BadgePatterns: Story = {
  render: () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', padding: '1rem' }}>
      <div>
        <p style={{ margin: '0 0 0.5rem', fontSize: '0.75rem', color: 'var(--color-slate-500)' }}>
          プル待ちのみ
        </p>
        <GitSyncActionButton action="pull" badgeCount={5} />
      </div>
      <div>
        <p style={{ margin: '0 0 0.5rem', fontSize: '0.75rem', color: 'var(--color-slate-500)' }}>
          プッシュ待ちのみ
        </p>
        <GitSyncActionButton action="push" badgeCount={23} />
      </div>
      <div>
        <p style={{ margin: '0 0 0.5rem', fontSize: '0.75rem', color: 'var(--color-slate-500)' }}>
          両方あり
        </p>
        <div style={{ display: 'flex', gap: '0.125rem' }}>
          <GitSyncActionButton action="pull" badgeCount={3} />
          <GitSyncActionButton action="push" badgeCount={12} />
        </div>
      </div>
      <div>
        <p style={{ margin: '0 0 0.5rem', fontSize: '0.75rem', color: 'var(--color-slate-500)' }}>
          大きい件数
        </p>
        <div style={{ display: 'flex', gap: '0.125rem' }}>
          <GitSyncActionButton action="pull" badgeCount={99} />
          <GitSyncActionButton action="push" badgeCount={150} />
        </div>
      </div>
    </div>
  ),
}

export const InToolbarContext: Story = {
  render: () => (
    <div
      style={{
        width: 480,
        border: '1px solid var(--color-slate-200)',
        borderRadius: '0.375rem',
        overflow: 'hidden',
        background: 'var(--color-surface-main)',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.125rem',
          minHeight: '3rem',
          padding: '0.5rem 0.75rem',
          background: 'var(--color-surface-header)',
          borderBottom: '1px solid var(--color-slate-200)',
        }}
      >
        <GitSyncActionButton action="pull" badgeCount={5} />
        <GitSyncActionButton action="push" badgeCount={23} />
        <GitSyncActionButton action="fetch" />
      </div>
      <div style={{ padding: '1rem', fontSize: '0.8125rem', color: 'var(--color-slate-500)' }}>
        メインコンテンツ領域
      </div>
    </div>
  ),
}
