import type { Meta, StoryObj } from '@storybook/react-vite'

import { splitBranchTrees } from '../../utils/branchTree'
import { collectWorktreeBranches } from '../../utils/branchMarks'
import {
  BranchSectionIcon,
  BriefcaseIcon,
  CloudIcon,
  GitBranchIcon,
  HardDriveIcon,
  WorktreeIcon,
} from './BranchIcons'
import { BranchSection } from './BranchSection'
import { SidebarSection } from './SidebarSection'
import { SidebarStoryFrame } from './fixtures/sidebarStoryHelpers'
import { branchesComposite, worktreesComposite } from './fixtures/sidebarFixtures'

const meta = {
  title: 'Sidebar/BranchIcons',
  parameters: {
    layout: 'padded',
  },
} satisfies Meta

export default meta
type Story = StoryObj<typeof meta>

const compositeLocal = splitBranchTrees(branchesComposite).local
const compositeWorktreeBranches = collectWorktreeBranches(worktreesComposite)

const rowIconCandidates = [
  {
    id: 'git-branch-outline',
    label: 'GitBranch outline',
    description: 'WT なし行（現行）',
    icon: <GitBranchIcon />,
  },
  {
    id: 'hard-drive-outline',
    label: 'HardDrive outline',
    description: 'WT あり行・セクション（現行）',
    icon: <HardDriveIcon />,
  },
  {
    id: 'git-branch-fill',
    label: 'GitBranch fill',
    description: '参考（サイドバー未使用）',
    icon: <GitBranchIcon filled />,
  },
  {
    id: 'briefcase-outline',
    label: 'Briefcase outline',
    description: '旧 WT マーク（参考）',
    icon: <BriefcaseIcon filled={false} />,
  },
] as const

export const RowIconColors: Story = {
  name: '行アイコン（outline / fill）',
  render: () => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxWidth: 640 }}>
    <p style={{ margin: 0, fontSize: '0.8125rem', color: 'var(--color-slate-600)' }}>
      本番のローカルブランチは通常行のアイコンを非表示。ここでは比較のためアイコンありで表示。
      色はブランチ状態（Active / WT / Idle）と連動します。
    </p>
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
        defaultExpanded
        onSelect={() => {}}
      />
    </SidebarStoryFrame>
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
        gap: '0.75rem',
      }}
    >
      {rowIconCandidates.map((candidate) => (
        <div
          key={candidate.id}
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.75rem',
            border: '1px solid var(--color-slate-200)',
            borderRadius: '0.375rem',
            background: 'var(--color-white)',
          }}
        >
          <span style={{ color: 'var(--color-slate-700)' }}>{candidate.icon}</span>
          <span style={{ fontSize: '0.75rem', color: 'var(--color-slate-700)', fontWeight: 600 }}>
            {candidate.label}
          </span>
          <span style={{ fontSize: '0.6875rem', color: 'var(--color-slate-500)', textAlign: 'center' }}>
            {candidate.description}
          </span>
        </div>
      ))}
    </div>
  </div>
  ),
}

export const SidebarSectionIcons: Story = {
  name: 'サイドバー全セクションアイコン',
  render: () => (
    <SidebarStoryFrame>
      <SidebarSection title="ワークツリー" icon={<WorktreeIcon />}>
        <p style={{ margin: 0, padding: '0.375rem 0.75rem', fontSize: '0.8125rem', color: 'var(--color-slate-500)' }}>
          …
        </p>
      </SidebarSection>
      <SidebarSection title="ブランチ" icon={<BranchSectionIcon />}>
        <p style={{ margin: 0, padding: '0.375rem 0.75rem', fontSize: '0.8125rem', color: 'var(--color-slate-500)' }}>
          …
        </p>
      </SidebarSection>
      <SidebarSection title="リモート" icon={<CloudIcon />}>
        <p style={{ margin: 0, padding: '0.375rem 0.75rem', fontSize: '0.8125rem', color: 'var(--color-slate-500)' }}>
          …
        </p>
      </SidebarSection>
    </SidebarStoryFrame>
  ),
}
