import type { Meta, StoryObj } from '@storybook/react-vite'

import { splitBranchTrees } from '../../utils/branchTree'
import { BranchSectionIcon } from './BranchIcons'
import { BranchSection } from './BranchSection'
import { SidebarStoryFrame } from './fixtures/sidebarStoryHelpers'
import {
  branchesBadgePatterns,
  branchesComposite,
  worktreesComposite,
} from './fixtures/sidebarFixtures'
import { collectWorktreeBranches } from '../../utils/branchMarks'

const meta = {
  title: 'Sidebar/BranchSection',
  component: BranchSection,
  decorators: [
    (Story) => (
      <SidebarStoryFrame>
        <Story />
      </SidebarStoryFrame>
    ),
  ],
  args: {
    title: 'ブランチ',
    icon: <BranchSectionIcon />,
    selectedBranch: null,
    onSelect: () => {},
    checkedOutBranch: null,
    worktreeBranches: new Set<string>(),
    showWorktreeMarks: false,
  },
} satisfies Meta<typeof BranchSection>

export default meta
type Story = StoryObj<typeof meta>

const badgePatternNodes = splitBranchTrees(branchesBadgePatterns).local

export const SyncClean: Story = {
  name: '同期済み（バッジなし）',
  args: {
    nodes: badgePatternNodes,
    selectedBranch: 'sync/clean',
  },
}

export const AheadOnly: Story = {
  name: 'プッシュ待ちのみ（↑）',
  args: {
    nodes: badgePatternNodes,
    selectedBranch: 'sync/ahead-only',
  },
}

export const BehindOnly: Story = {
  name: 'プル待ちのみ（↓）',
  args: {
    nodes: badgePatternNodes,
    selectedBranch: 'sync/behind-only',
  },
}

export const AheadAndBehind: Story = {
  name: 'プッシュ・プル両方',
  args: {
    nodes: badgePatternNodes,
    selectedBranch: 'sync/ahead-behind',
  },
}

export const LargeCounts: Story = {
  name: '大きな件数',
  args: {
    nodes: badgePatternNodes,
    selectedBranch: 'sync/large-counts',
  },
}

const compositeLocal = splitBranchTrees(branchesComposite).local
const compositeWorktreeBranches = collectWorktreeBranches(worktreesComposite)

export const WithWorktreeIcon: Story = {
  name: 'ワークツリーアイコン（カバン）',
  args: {
    nodes: compositeLocal,
    selectedBranch: 'feature/hoge',
    checkedOutBranch: 'feature/hoge',
    worktreeBranches: compositeWorktreeBranches,
    showWorktreeMarks: true,
  },
}

export const NestedBranches: Story = {
  name: 'ネストしたブランチ名',
  args: {
    nodes: compositeLocal,
    selectedBranch: 'feature/sync-badge',
    checkedOutBranch: 'feature/hoge',
    worktreeBranches: compositeWorktreeBranches,
    showWorktreeMarks: true,
    defaultExpanded: true,
  },
}

export const IconInContext: Story = {
  name: '見出しアイコン（実 UI）',
  args: {
    title: 'ブランチ',
    icon: <BranchSectionIcon />,
    nodes: compositeLocal,
    selectedBranch: 'feature/hoge',
    checkedOutBranch: 'feature/hoge',
    worktreeBranches: compositeWorktreeBranches,
    showWorktreeMarks: true,
    defaultExpanded: true,
  },
}
