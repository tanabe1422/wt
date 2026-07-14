import type { CSSProperties, ReactNode } from 'react'
import type { Meta, StoryObj } from '@storybook/react-vite'

import { collectWorktreeBranches } from '../../utils/branchMarks'
import { splitBranchTrees } from '../../utils/branchTree'
import { BranchSectionIcon } from './BranchIcons'
import { BranchSection } from './BranchSection'
import { SidebarStoryFrame } from './fixtures/sidebarStoryHelpers'
import {
  branchesToneDistinction,
  worktreesToneDistinction,
} from './fixtures/sidebarFixtures'

const toneLocal = splitBranchTrees(branchesToneDistinction).local
const toneWorktreeBranches = collectWorktreeBranches(worktreesToneDistinction)

/** 案E 適用前の見た目に戻す（比較用） */
const legacyToneVars = {
  '--branch-tone-idle': 'var(--color-slate-600)',
  '--branch-weight-worktree': 'inherit',
  '--branch-weight-idle': 'inherit',
} as CSSProperties

const meta = {
  title: 'Sidebar/BranchToneDistinction',
  component: BranchSection,
  args: {
    title: 'ブランチ',
    icon: <BranchSectionIcon />,
    nodes: toneLocal,
    selectedBranch: 'feature/hoge',
    checkedOutBranch: 'feature/hoge',
    worktreeBranches: toneWorktreeBranches,
    showWorktreeMarks: true,
    defaultExpanded: true,
    onSelect: () => {},
  },
} satisfies Meta<typeof BranchSection>

export default meta
type Story = StoryObj<typeof meta>

function DistinctionFrame({
  note,
  vars,
  children,
}: {
  note: string
  vars?: CSSProperties
  children: ReactNode
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
      <p style={{ margin: 0, fontSize: '0.8125rem', color: 'var(--color-slate-600)' }}>{note}</p>
      <div style={vars}>{children}</div>
    </div>
  )
}

function Panel({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
      <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-slate-700)' }}>
        {title}
      </div>
      <SidebarStoryFrame>{children}</SidebarStoryFrame>
    </div>
  )
}

export const Current: Story = {
  name: '現行（案E）',
  render: (args) => (
    <DistinctionFrame note="本番適用: Idle=slate-500 / WT=slate-900（weight 通常） / 通常アイコン非表示（スロット幅維持）。">
      <SidebarStoryFrame>
        <BranchSection {...args} />
      </SidebarStoryFrame>
    </DistinctionFrame>
  ),
}

export const PlanA: Story = {
  name: '案A · Idleを薄く',
  render: (args) => (
    <DistinctionFrame
      note="Idle を slate-400 にして、WT（slate-900）とのコントラストを広げる。"
      vars={
        {
          ...legacyToneVars,
          '--branch-tone-idle': 'var(--color-slate-400)',
        } as CSSProperties
      }
    >
      <SidebarStoryFrame>
        <BranchSection {...args} hideIdleIcons={false} />
      </SidebarStoryFrame>
    </DistinctionFrame>
  ),
}

export const PlanB: Story = {
  name: '案B · WTにアクセント色',
  render: (args) => (
    <DistinctionFrame
      note="WT を cyan-600、Idle を slate-500。青は Active 専用のまま。"
      vars={
        {
          ...legacyToneVars,
          '--branch-tone-worktree': 'var(--color-cyan-600)',
          '--branch-tone-idle': 'var(--color-slate-500)',
        } as CSSProperties
      }
    >
      <SidebarStoryFrame>
        <BranchSection {...args} hideIdleIcons={false} />
      </SidebarStoryFrame>
    </DistinctionFrame>
  ),
}

export const PlanC: Story = {
  name: '案C · weightで区別',
  render: (args) => (
    <DistinctionFrame
      note="色は旧デフォルト。WT=weight 600、Idle=weight 400。"
      vars={
        {
          ...legacyToneVars,
          '--branch-weight-worktree': '600',
          '--branch-weight-idle': '400',
        } as CSSProperties
      }
    >
      <SidebarStoryFrame>
        <BranchSection {...args} hideIdleIcons={false} />
      </SidebarStoryFrame>
    </DistinctionFrame>
  ),
}

export const PlanD: Story = {
  name: '案D · 通常はアイコンなし',
  render: (args) => (
    <DistinctionFrame
      note="通常ブランチの GitBranch アイコンを非表示。色は旧デフォルト。"
      vars={legacyToneVars}
    >
      <SidebarStoryFrame>
        <BranchSection {...args} hideIdleIcons />
      </SidebarStoryFrame>
    </DistinctionFrame>
  ),
}

export const PlanE: Story = {
  name: '案E · 複合（採用）',
  render: (args) => (
    <DistinctionFrame note="採用案。左右でアイコンあり/なしを比較（ラベル開始位置は iconSlot 固定幅で揃える）。">
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(2, minmax(0, 280px))',
          gap: '1rem',
          alignItems: 'start',
        }}
      >
        <Panel title="アイコンあり（参考）">
          <BranchSection {...args} hideIdleIcons={false} />
        </Panel>
        <Panel title="アイコンなし（本番）">
          <BranchSection {...args} hideIdleIcons />
        </Panel>
      </div>
    </DistinctionFrame>
  ),
}

export const PlanF: Story = {
  name: '案F · WTバッジ',
  render: (args) => (
    <DistinctionFrame
      note="色・アイコンは旧デフォルト。WT 行に小さな WT ピルを表示。"
      vars={legacyToneVars}
    >
      <SidebarStoryFrame>
        <BranchSection {...args} hideIdleIcons={false} showWorktreeBadge />
      </SidebarStoryFrame>
    </DistinctionFrame>
  ),
}

export const Legacy: Story = {
  name: '旧（案E適用前）',
  render: (args) => (
    <DistinctionFrame
      note="適用前: Idle=slate-600 / weight 通常 / アイコンあり。"
      vars={legacyToneVars}
    >
      <SidebarStoryFrame>
        <BranchSection {...args} hideIdleIcons={false} />
      </SidebarStoryFrame>
    </DistinctionFrame>
  ),
}
