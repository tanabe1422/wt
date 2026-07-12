import type { Meta, StoryObj } from '@storybook/react-vite'

import { WorktreeList } from './WorktreeList'
import { SidebarStoryFrame } from './fixtures/sidebarStoryHelpers'
import {
  FIXTURE_REPO_ROOT,
  worktreesChangeCounts,
  worktreesClean,
  worktreesDetached,
  worktreesMainDirty,
} from './fixtures/sidebarFixtures'

const meta = {
  title: 'Sidebar/WorktreeList',
  component: WorktreeList,
  decorators: [
    (Story) => (
      <SidebarStoryFrame>
        <Story />
      </SidebarStoryFrame>
    ),
  ],
  args: {
    selectedWorktree: FIXTURE_REPO_ROOT,
    onSelect: () => {},
    onContextMenu: (worktree) => {
      console.info('[story] worktree context menu', worktree.path)
    },
  },
} satisfies Meta<typeof WorktreeList>

export default meta
type Story = StoryObj<typeof meta>

export const NoChanges: Story = {
  name: '変更なし',
  args: {
    worktrees: worktreesClean,
    selectedWorktree: FIXTURE_REPO_ROOT,
  },
}

export const ChangeCounts: Story = {
  name: '変更ファイル数のバリエーション',
  args: {
    worktrees: worktreesChangeCounts,
    selectedWorktree: FIXTURE_REPO_ROOT,
  },
}

export const MainDirtyOnly: Story = {
  name: 'メインのみ変更あり',
  args: {
    worktrees: worktreesMainDirty,
    selectedWorktree: FIXTURE_REPO_ROOT,
  },
}

export const Detached: Story = {
  name: 'detached ワークツリー',
  args: {
    worktrees: worktreesDetached,
    selectedWorktree: `${FIXTURE_REPO_ROOT}-wt-detached`,
  },
}
