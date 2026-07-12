import type { Meta, StoryObj } from '@storybook/react-vite'

import { SplitToolbarActionButton } from './SplitToolbarActionButton'
import { GitSyncIcon } from './GitSyncIcons'

const meta = {
  title: 'Toolbar/SplitToolbarActionButton',
  component: SplitToolbarActionButton,
  args: {
    label: 'フェッチ',
    icon: <GitSyncIcon action="fetch" size={20} />,
    menuItems: [
      {
        label: 'フェッチして prune',
        onClick: () => {
          console.info('[story] fetch with prune')
        },
      },
    ],
  },
  decorators: [
    (Story) => (
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
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof SplitToolbarActionButton>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const Disabled: Story = {
  args: { disabled: true },
}

export const InToolbarContext: Story = {
  decorators: [
    (Story) => (
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
          <Story />
        </div>
        <div style={{ padding: '1rem', fontSize: '0.8125rem', color: 'var(--color-slate-500)' }}>
          右の三角矢印で「フェッチして prune」メニューが開きます
        </div>
      </div>
    ),
  ],
}
