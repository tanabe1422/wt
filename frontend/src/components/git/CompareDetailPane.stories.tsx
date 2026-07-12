import type { Meta, StoryObj } from '@storybook/react-vite'

import { CompareDetailPane } from './CompareDetailPane'

const meta = {
  title: 'Git/CompareDetailPane',
  component: CompareDetailPane,
  parameters: {
    layout: 'padded',
  },
  args: {
    worktreePath: 'C:/dev/sample-repo',
    range: {
      fromRef: 'main',
      toRef: 'feature/hoge',
    },
  },
  decorators: [
    (Story) => (
      <div
        style={{
          width: '100%',
          minWidth: 720,
          height: 360,
          border: '1px solid var(--color-slate-200)',
          borderRadius: '0.375rem',
          overflow: 'hidden',
        }}
      >
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof CompareDetailPane>

export default meta
type Story = StoryObj<typeof meta>

export const BranchCompare: Story = {
  name: 'ブランチ比較（モック API）',
}

export const CommitCompare: Story = {
  name: 'コミット比較',
  args: {
    range: {
      fromRef: 'a1b2c3d',
      toRef: 'e4f5g6h',
    },
  },
}
