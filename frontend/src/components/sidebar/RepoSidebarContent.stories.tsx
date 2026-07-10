import { useState } from 'react'
import type { Meta, StoryObj } from '@storybook/react-vite'

import { RepoSidebarContent } from './RepoSidebarContent'
import { SidebarStoryFrame } from './fixtures/sidebarStoryHelpers'
import {
  branchesComposite,
  branchesFullSidebar,
  worktreesComposite,
  worktreesFullSidebar,
  FIXTURE_REPO_ROOT,
} from './fixtures/sidebarFixtures'

const meta = {
  title: 'Sidebar/RepoSidebarContent',
  component: RepoSidebarContent,
  decorators: [
    (Story) => (
      <SidebarStoryFrame>
        <Story />
      </SidebarStoryFrame>
    ),
  ],
  args: {
    onSelectBranch: () => {},
    onSelectWorktree: () => {},
  },
} satisfies Meta<typeof RepoSidebarContent>

export default meta
type Story = StoryObj<typeof meta>

export const FullPatterns: Story = {
  name: '複合パターン（全体）',
  args: {
    branches: branchesFullSidebar,
    worktrees: worktreesFullSidebar,
    selectedBranch: 'feature/hoge',
    selectedWorktree: FIXTURE_REPO_ROOT,
  },
}

export const Interactive: Story = {
  name: '選択操作あり',
  args: {
    branches: branchesComposite,
    worktrees: worktreesComposite,
    selectedBranch: 'feature/hoge',
    selectedWorktree: FIXTURE_REPO_ROOT,
    onSelectBranch: () => {},
    onSelectWorktree: () => {},
  },
  render: (args) => {
    function InteractiveSidebar() {
      const [selectedBranch, setSelectedBranch] = useState(args.selectedBranch)
      const [selectedWorktree, setSelectedWorktree] = useState(args.selectedWorktree)

      const handleSelectWorktree = (path: string) => {
        setSelectedWorktree(path)
        const worktree = args.worktrees.find((entry) => entry.path === path)
        if (worktree?.branch) {
          setSelectedBranch(worktree.branch)
        }
      }

      return (
        <RepoSidebarContent
          {...args}
          selectedBranch={selectedBranch}
          selectedWorktree={selectedWorktree}
          onSelectBranch={setSelectedBranch}
          onSelectWorktree={handleSelectWorktree}
        />
      )
    }

    return <InteractiveSidebar />
  },
}

export const AheadBehindFocus: Story = {
  name: '同期バッジの見え方',
  args: {
    branches: branchesComposite,
    worktrees: worktreesComposite.map((entry) => ({ ...entry, changedFileCount: 0 })),
    selectedBranch: 'feature/sync-badge',
    selectedWorktree: `${FIXTURE_REPO_ROOT}-wt-sync`,
  },
}

export const ChangesFocus: Story = {
  name: '変更ファイルバッジの見え方',
  args: {
    branches: branchesComposite.map((entry) => ({
      ...entry,
      aheadCount: 0,
      behindCount: 0,
    })),
    worktrees: worktreesComposite,
    selectedBranch: 'feature/hoge',
    selectedWorktree: FIXTURE_REPO_ROOT,
  },
}
