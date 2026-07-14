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
  name: 'ワークツリーアイコン（HardDrive）',
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

export const IconFillCandidates: Story = {
  name: 'アイコン outline / fill',
  args: {
    nodes: compositeLocal,
    selectedBranch: 'feature/hoge',
    checkedOutBranch: 'feature/hoge',
    worktreeBranches: compositeWorktreeBranches,
    showWorktreeMarks: true,
    defaultExpanded: true,
  },
  render: () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      <p style={{ margin: 0, fontSize: '0.8125rem', color: 'var(--color-slate-600)' }}>
        WT マークは HardDrive outline 固定。枝アイコンだけ fill / outline を比較可能。
        サイドバーのデフォルトはすべて outline。
      </p>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
          gap: '1rem',
          alignItems: 'start',
        }}
      >
        {(
          [
            {
              id: 'outline',
              name: 'すべて outline（現行）',
              filledIcons: false,
            },
            {
              id: 'branch-fill',
              name: '枝だけ fill（参考）',
              filledIcons: true,
            },
          ] as const
        ).map((candidate) => (
          <div key={candidate.id} style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--color-slate-900)' }}>
              {candidate.name}
            </div>
            <SidebarStoryFrame>
              <BranchSection
                title="ブランチ"
                icon={<BranchSectionIcon />}
                nodes={compositeLocal}
                selectedBranch="feature/hoge"
                checkedOutBranch="feature/hoge"
                worktreeBranches={compositeWorktreeBranches}
                showWorktreeMarks
                hideIdleIcons={false}
                filledIcons={candidate.filledIcons}
                defaultExpanded
                onSelect={() => {}}
              />
            </SidebarStoryFrame>
          </div>
        ))}
      </div>
    </div>
  ),
}
