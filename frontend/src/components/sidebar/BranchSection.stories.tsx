import type { CSSProperties } from 'react'
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

const labelToneCandidates = [
  {
    id: 'A',
    name: 'A · 推奨（要望どおり）',
    note: 'Active = 青ドットと同色 / WT = 通常黒 / なし = slate-600（文字・アイコン共通）',
    vars: {
      '--branch-tone-active': 'var(--color-blue-600)',
      '--branch-tone-worktree': 'var(--color-slate-900)',
      '--branch-tone-idle': 'var(--color-slate-600)',
    },
  },
  {
    id: 'B',
    name: 'B · Idle をもう一段薄く',
    note: 'なしを slate-500 にして、WT との差をはっきり',
    vars: {
      '--branch-tone-active': 'var(--color-blue-600)',
      '--branch-tone-worktree': 'var(--color-slate-900)',
      '--branch-tone-idle': 'var(--color-slate-500)',
    },
  },
  {
    id: 'C',
    name: 'C · Active を一段濃く',
    note: '青ドットは 600 のまま、文字・アイコンだけ blue-700',
    vars: {
      '--branch-tone-active': 'var(--color-blue-700)',
      '--branch-tone-worktree': 'var(--color-slate-900)',
      '--branch-tone-idle': 'var(--color-slate-600)',
    },
  },
  {
    id: 'D',
    name: 'D · WT もやや抑える',
    note: '階層を Active > WT(700) > Idle(500) の 3 段に',
    vars: {
      '--branch-tone-active': 'var(--color-blue-600)',
      '--branch-tone-worktree': 'var(--color-slate-700)',
      '--branch-tone-idle': 'var(--color-slate-500)',
    },
  },
  {
    id: 'E',
    name: 'E · Idle 控えめ・差は小さめ',
    note: 'なしを slate-700。差は小さく可読性重視',
    vars: {
      '--branch-tone-active': 'var(--color-blue-600)',
      '--branch-tone-worktree': 'var(--color-slate-900)',
      '--branch-tone-idle': 'var(--color-slate-700)',
    },
  },
] as const

export const LabelToneCandidates: Story = {
  name: 'ラベル・アイコン色の候補',
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
        青ドット = 選択中 WT の現在ブランチ / カバン = WT あり / 枝 = WT なし。
        文字色と行アイコン色は連動。いまの実装デフォルトは A + HardDrive / GitBranch outline。
      </p>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
          gap: '1rem',
          alignItems: 'start',
        }}
      >
        {labelToneCandidates.map((candidate) => (
          <div key={candidate.id} style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <div>
              <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--color-slate-900)' }}>
                {candidate.name}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--color-slate-500)' }}>{candidate.note}</div>
            </div>
            <div style={candidate.vars as CSSProperties}>
              <SidebarStoryFrame>
                <BranchSection
                  title="ブランチ"
                  icon={<BranchSectionIcon />}
                  nodes={compositeLocal}
                  selectedBranch="feature/hoge"
                  checkedOutBranch="feature/hoge"
                  worktreeBranches={compositeWorktreeBranches}
                  showWorktreeMarks
                  defaultExpanded
                  onSelect={() => {}}
                />
              </SidebarStoryFrame>
            </div>
          </div>
        ))}
      </div>
    </div>
  ),
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
