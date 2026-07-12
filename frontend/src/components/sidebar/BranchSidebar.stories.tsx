import { useState } from 'react'
import type { Meta, StoryObj } from '@storybook/react-vite'

import type { BranchEntry, WorktreeEntry } from '../../types'
import { BranchSidebar } from './BranchSidebar'
import { SidebarStoryFrame } from './fixtures/sidebarStoryHelpers'
import {
  branchesComposite,
  branchesFullSidebar,
  FIXTURE_REPO_ROOT,
  worktreesComposite,
  worktreesFullSidebar,
} from './fixtures/sidebarFixtures'

interface BranchSidebarStoryProps {
  branches: BranchEntry[]
  worktrees: WorktreeEntry[]
  loading?: boolean
  error?: string | null
}

function BranchSidebarDemo({
  branches,
  worktrees,
  loading = false,
  error = null,
}: BranchSidebarStoryProps) {
  const [selectedBranch, setSelectedBranch] = useState('feature/hoge')
  const [selectedWorktree, setSelectedWorktree] = useState(FIXTURE_REPO_ROOT)

  return (
    <SidebarStoryFrame>
      <BranchSidebar
        activeRepository={FIXTURE_REPO_ROOT}
        branches={branches}
        worktrees={worktrees}
        loading={loading}
        error={error}
        selectedBranch={selectedBranch}
        onSelectBranch={setSelectedBranch}
        selectedWorktree={selectedWorktree}
        onSelectWorktree={setSelectedWorktree}
        onReload={() => undefined}
      />
    </SidebarStoryFrame>
  )
}

const meta = {
  title: 'Sidebar/BranchSidebar',
  component: BranchSidebarDemo,
  parameters: {
    layout: 'padded',
  },
  args: {
    branches: branchesComposite,
    worktrees: worktreesComposite,
  },
} satisfies Meta<typeof BranchSidebarDemo>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  name: '複合パターン',
  args: {
    branches: branchesFullSidebar,
    worktrees: worktreesFullSidebar,
  },
}

export const Compact: Story = {
  name: 'コンパクト',
}

export const Loading: Story = {
  name: '読み込み中',
  args: {
    branches: [],
    worktrees: [],
    loading: true,
  },
}

export const ErrorState: Story = {
  name: 'エラー',
  args: {
    branches: [],
    worktrees: [],
    error: 'リポジトリ情報の取得に失敗しました',
  },
}
