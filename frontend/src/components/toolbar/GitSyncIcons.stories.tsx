import type { Meta, StoryObj } from '@storybook/react-vite'

import { GitSyncActionButton } from './GitSyncActionButton'
import { GitSyncIcon, gitSyncActionLabel, type GitSyncAction } from './GitSyncIcons'

const ACTIONS: GitSyncAction[] = ['pull', 'push', 'fetch']

const meta = {
  title: 'Toolbar/GitSyncIcons',
  component: GitSyncIcon,
  args: {
    action: 'pull' as const,
  },
  argTypes: {
    action: {
      control: 'select',
      options: ACTIONS,
    },
  },
} satisfies Meta<typeof GitSyncIcon>

export default meta
type Story = StoryObj<typeof meta>

function IconCell({
  action,
  description,
}: {
  action: GitSyncAction
  description: string
}) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '0.5rem',
        padding: '0.75rem 1rem',
        border: '1px solid var(--color-slate-200)',
        borderRadius: '0.375rem',
        background: 'var(--color-white)',
        minWidth: '7rem',
      }}
    >
      <GitSyncIcon action={action} size={24} />
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--color-slate-700)' }}>
          {gitSyncActionLabel(action)}
        </div>
        <div style={{ fontSize: '0.75rem', color: 'var(--color-slate-500)' }}>{description}</div>
      </div>
    </div>
  )
}

export const Pull: Story = {
  args: { action: 'pull' },
}

export const Push: Story = {
  args: { action: 'push' },
}

export const Fetch: Story = {
  args: { action: 'fetch' },
}

export const AllIcons: Story = {
  render: () => (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', padding: '1rem' }}>
      <IconCell action="pull" description="下矢印 — リモートから取り込む" />
      <IconCell action="push" description="上矢印 — リモートへ送る" />
      <IconCell action="fetch" description="回転矢印 — リモート情報を更新" />
    </div>
  ),
}

export const AsButtons: Story = {
  render: () => (
    <div
      style={{
        display: 'flex',
        gap: '0.125rem',
        padding: '0.5rem',
        background: 'var(--color-surface-header)',
        border: '1px solid var(--color-slate-200)',
        borderRadius: '0.375rem',
        width: 'fit-content',
      }}
    >
      {ACTIONS.map((action) => (
        <GitSyncActionButton key={action} action={action} />
      ))}
    </div>
  ),
}
