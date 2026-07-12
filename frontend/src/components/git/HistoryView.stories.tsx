import type { Meta, StoryObj } from '@storybook/react-vite'

import { HistoryView } from './HistoryView'

const meta = {
  title: 'Git/HistoryView',
  component: HistoryView,
  parameters: {
    layout: 'padded',
  },
  args: {
    worktreePath: 'C:/dev/sample-repo',
    currentBranch: 'feature/hoge',
  },
  decorators: [
    (Story) => (
      <div
        style={{
          width: '100%',
          minWidth: 880,
          height: 560,
          border: '1px solid var(--color-slate-200)',
          borderRadius: '0.375rem',
          overflow: 'hidden',
        }}
      >
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof HistoryView>

export default meta
type Story = StoryObj<typeof meta>

export const AllBranches: Story = {
  name: '全ブランチ（モック API）',
}

export const DetachedHead: Story = {
  name: 'detached HEAD（現在ブランチ無効）',
  args: {
    currentBranch: 'HEAD',
  },
}
