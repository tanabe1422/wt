import type { Meta, StoryObj } from '@storybook/react-vite'
import type { ReactNode } from 'react'

import { splitBranchTrees } from '../../utils/branchTree'
import { collectWorktreeBranches } from '../../utils/branchMarks'
import {
  BranchSectionIcon,
  BriefcaseIcon,
  CloudIcon,
  FolderIcon,
  GitBranchIcon,
  WorktreeIcon,
} from './BranchIcons'
import { BranchSection } from './BranchSection'
import { SidebarSection } from './SidebarSection'
import { SidebarStoryFrame } from './fixtures/sidebarStoryHelpers'
import { branchesComposite, worktreesComposite } from './fixtures/sidebarFixtures'
import sectionStyles from './BranchSection.module.css'

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

function IconFrame({
  label,
  description,
  children,
}: {
  label: string
  description?: string
  children: ReactNode
}) {
  return (
    <figure
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '0.5rem',
        margin: 0,
        width: 280,
      }}
    >
      <div
        style={{
          border: '1px solid var(--color-slate-200)',
          borderRadius: '0.375rem',
          overflow: 'hidden',
          background: 'var(--color-surface-main)',
        }}
      >
        {children}
      </div>
      <figcaption
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '0.125rem',
          fontSize: '0.75rem',
          color: 'var(--color-slate-600)',
        }}
      >
        <strong style={{ color: 'var(--color-slate-800)' }}>{label}</strong>
        {description ? <span>{description}</span> : null}
      </figcaption>
    </figure>
  )
}

function SectionHeaderPreview({ icon, title }: { icon: ReactNode; title: string }) {
  return (
    <button type="button" className={sectionStyles.header}>
      <span className={sectionStyles.caret} aria-hidden />
      <span className={sectionStyles.sectionIcon}>{icon}</span>
      {title}
    </button>
  )
}

function GitBranchLucideIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M6 3v12M18 9a3 3 0 1 0-2.83-4M6 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

/** 幹＋左右に枝が出る Y 字 */
function TwigYIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M12 20V10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M12 10 18 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M12 10 6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}

/** 曲線の幹から小枝が伸びる */
function TwigCurvedIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M7 20c2-4 4-8 8-14"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path d="M10 13 6 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M13 9 17 11" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M11 16 8 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}

/** 幹の途中から2本の枝（ノードなしの分岐） */
function TwigForkIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M9 20V8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M9 12h8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M17 12l3-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M17 12l3 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}

/** 1点から3方向に枝が伸びる（束ねた枝） */
function TwigRadialIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M12 19V11" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M12 11 18 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M12 11 6 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M12 11 12 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}

/** 幹に短い小枝が複数（木の枝っぽい） */
function TwigNaturalIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M8 20c1.5-3 3.5-7 7-13"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path d="M10 15l-3-2" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
      <path d="M12 11l4-2" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
      <path d="M13 8l3 1" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
    </svg>
  )
}

function GitMergeIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="18" cy="18" r="2.5" stroke="currentColor" strokeWidth="2" />
      <circle cx="6" cy="6" r="2.5" stroke="currentColor" strokeWidth="2" />
      <circle cx="18" cy="6" r="2.5" stroke="currentColor" strokeWidth="2" />
      <path
        d="M6 8.5v5a4 4 0 0 0 4 4h5"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  )
}

function GitLogoIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M12 2L4 7v10l8 5 8-5V7l-8-5z"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinejoin="round"
      />
      <path
        d="M9.5 10.5v5l3 1.75 3-1.75v-5M9.5 10.5L12 9l2.5 1.5M12 9V16.25"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function ListTreeIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M12 12v8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path
        d="M5 8h14M5 12h8M5 16h4"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <circle cx="19" cy="8" r="2.5" stroke="currentColor" strokeWidth="2" />
      <circle cx="13" cy="12" r="2.5" stroke="currentColor" strokeWidth="2" />
      <circle cx="9" cy="16" r="2.5" stroke="currentColor" strokeWidth="2" />
    </svg>
  )
}

/** Lucide list-tree 系 */
function ListTreeLucideIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M21 12h-8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M21 6H8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M21 18h-8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path
        d="M3 6v4c0 1.1.9 2 2 2h3"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M3 10v6c0 1.1.9 2 2 2h3"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

/** 3段の二分木 */
function BinaryTreeIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="4" r="2" stroke="currentColor" strokeWidth="2" />
      <circle cx="6" cy="12" r="2" stroke="currentColor" strokeWidth="2" />
      <circle cx="18" cy="12" r="2" stroke="currentColor" strokeWidth="2" />
      <circle cx="4" cy="20" r="2" stroke="currentColor" strokeWidth="2" />
      <circle cx="8" cy="20" r="2" stroke="currentColor" strokeWidth="2" />
      <circle cx="16" cy="20" r="2" stroke="currentColor" strokeWidth="2" />
      <circle cx="20" cy="20" r="2" stroke="currentColor" strokeWidth="2" />
      <path
        d="M12 6 6 10M12 6l6 4M6 14l-2 4M6 14l2 4M18 14l-2 4M18 14l2 4"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
    </svg>
  )
}

/** 落葉樹 */
function TreeDeciduousIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M12 22v-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path
        d="M6 17c0-3 2.5-5 6-7 3.5 2 6 4 6 7"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M8 13c0-2 1.8-3.5 4-5 2.2 1.5 4 3 4 5"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M10 9c0-1.5 1-2.5 2-3 1 .5 2 1.5 2 3"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

/** 針葉樹 */
function TreePineIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M12 22v-3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path
        d="m7 19 5-5 5 5"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="m8 14 4-4 4 4"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="m9 9 3-3 3 3"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

/** ネットワークツリー */
function NetworkTreeIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="5" r="2.5" stroke="currentColor" strokeWidth="2" />
      <circle cx="5" cy="19" r="2.5" stroke="currentColor" strokeWidth="2" />
      <circle cx="12" cy="19" r="2.5" stroke="currentColor" strokeWidth="2" />
      <circle cx="19" cy="19" r="2.5" stroke="currentColor" strokeWidth="2" />
      <path
        d="M12 8v4M12 12H5v4M12 12h7v4"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function LayersIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="m12 3 8 4.5v9L12 21l-8-4.5v-9L12 3z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path d="m12 12 8-4.5M12 12v9M12 12 4 7.5" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
    </svg>
  )
}

const twigIconCandidates = [
  {
    id: 'git-branch-lucide',
    label: 'GitBranch（Lucide）',
    description: '定番の枝分かれ。丸ノード付き',
    icon: <GitBranchLucideIcon />,
  },
  {
    id: 'git-branch',
    label: 'GitBranchIcon（行と同じ）',
    description: '3点分岐。Git クライアントでよく見る形',
    icon: <GitBranchIcon />,
  },
  {
    id: 'twig-y',
    label: 'TwigY',
    description: '幹から左右に枝が出る Y 字',
    icon: <TwigYIcon />,
  },
  {
    id: 'twig-fork',
    label: 'TwigFork',
    description: '幹の途中から2本に分岐',
    icon: <TwigForkIcon />,
  },
  {
    id: 'twig-radial',
    label: 'TwigRadial',
    description: '1点から複数の枝（束ね感）',
    icon: <TwigRadialIcon />,
  },
  {
    id: 'twig-curved',
    label: 'TwigCurved',
    description: '曲線の幹＋小枝',
    icon: <TwigCurvedIcon />,
  },
  {
    id: 'twig-natural',
    label: 'TwigNatural',
    description: '木の枝っぽい曲線',
    icon: <TwigNaturalIcon />,
  },
] as const

const treeIconCandidates = [
  {
    id: 'tree-diagram',
    label: 'TreeDiagram（採用中）',
    description: '親子ノードの階層図。ブランチセクション見出しに使用中',
    icon: <BranchSectionIcon />,
  },
  {
    id: 'list-tree',
    label: 'ListTree',
    description: '幹＋段差のある横枝。階層リスト向き',
    icon: <ListTreeIcon />,
  },
  {
    id: 'list-tree-lucide',
    label: 'ListTree（Lucide）',
    description: '左に分岐、右にラベル線',
    icon: <ListTreeLucideIcon />,
  },
  {
    id: 'binary-tree',
    label: 'BinaryTree',
    description: '二分木。ネストしたブランチ名向き',
    icon: <BinaryTreeIcon />,
  },
  {
    id: 'network-tree',
    label: 'NetworkTree',
    description: '1親から複数子へ分岐',
    icon: <NetworkTreeIcon />,
  },
  {
    id: 'tree-deciduous',
    label: 'TreeDeciduous',
    description: '落葉樹。木そのもののイメージ',
    icon: <TreeDeciduousIcon />,
  },
  {
    id: 'tree-pine',
    label: 'TreePine',
    description: '針葉樹。三角層の木',
    icon: <TreePineIcon />,
  },
  {
    id: 'folder',
    label: 'FolderIcon（参考）',
    description: 'プレフィックスグループ行と同系',
    icon: <FolderIcon />,
  },
] as const

const sectionIconCandidates = [
  ...twigIconCandidates,
  ...treeIconCandidates,
  {
    id: 'git-merge',
    label: 'GitMerge',
    description: '分岐の逆方向。マージ感',
    icon: <GitMergeIcon />,
  },
  {
    id: 'layers',
    label: 'Layers',
    description: '重なり。ブランチの束ね感',
    icon: <LayersIcon />,
  },
  {
    id: 'git-logo',
    label: 'GitLogo（旧）',
    description: '以前の六角形アイコン',
    icon: <GitLogoIcon />,
  },
] as const

export const TwigIconCandidates: Story = {
  name: '枝っぽいアイコン',
  render: () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <p style={{ margin: 0, fontSize: '0.8125rem', color: 'var(--color-slate-600)' }}>
        ブランチ（枝）のイメージに近い候補だけを並べています。
      </p>
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '1.25rem',
          alignItems: 'flex-start',
        }}
      >
        {twigIconCandidates.map((candidate) => (
          <IconFrame key={candidate.id} label={candidate.label} description={candidate.description}>
            <SectionHeaderPreview icon={candidate.icon} title="ブランチ" />
          </IconFrame>
        ))}
      </div>
    </div>
  ),
}

export const TwigIconInContext: Story = {
  name: '枝っぽいアイコン（実 UI）',
  render: () => (
    <div
      style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: '1.25rem',
        alignItems: 'flex-start',
      }}
    >
      {twigIconCandidates.map((candidate) => (
        <IconFrame key={candidate.id} label={candidate.label}>
          <SidebarStoryFrame>
            <BranchSection
              title="ブランチ"
              icon={candidate.icon}
              nodes={compositeLocal}
              selectedBranch="feature/hoge"
              checkedOutBranch="feature/hoge"
              worktreeBranches={compositeWorktreeBranches}
              showWorktreeMarks
              defaultExpanded
              onSelect={() => {}}
            />
          </SidebarStoryFrame>
        </IconFrame>
      ))}
    </div>
  ),
}

export const TreeIconCandidates: Story = {
  name: 'Tree 系アイコン',
  render: () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <p style={{ margin: 0, fontSize: '0.8125rem', color: 'var(--color-slate-600)' }}>
        ツリー・階層・木のイメージに近い候補です。ネストしたブランチ一覧向きのものが多めです。
      </p>
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '1.25rem',
          alignItems: 'flex-start',
        }}
      >
        {treeIconCandidates.map((candidate) => (
          <IconFrame key={candidate.id} label={candidate.label} description={candidate.description}>
            <SectionHeaderPreview icon={candidate.icon} title="ブランチ" />
          </IconFrame>
        ))}
      </div>
    </div>
  ),
}

export const TreeIconInContext: Story = {
  name: 'Tree 系アイコン（実 UI）',
  render: () => (
    <div
      style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: '1.25rem',
        alignItems: 'flex-start',
      }}
    >
      {treeIconCandidates.map((candidate) => (
        <IconFrame key={candidate.id} label={candidate.label}>
          <SidebarStoryFrame>
            <BranchSection
              title="ブランチ"
              icon={candidate.icon}
              nodes={compositeLocal}
              selectedBranch="feature/hoge"
              checkedOutBranch="feature/hoge"
              worktreeBranches={compositeWorktreeBranches}
              showWorktreeMarks
              defaultExpanded
              onSelect={() => {}}
            />
          </SidebarStoryFrame>
        </IconFrame>
      ))}
    </div>
  ),
}

export const SectionIconCandidates: Story = {
  name: 'セクション見出しアイコン候補',
  render: () => (
    <div
      style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: '1.25rem',
        alignItems: 'flex-start',
      }}
    >
      {sectionIconCandidates.map((candidate) => (
        <IconFrame key={candidate.id} label={candidate.label} description={candidate.description}>
          <SectionHeaderPreview icon={candidate.icon} title="ブランチ" />
        </IconFrame>
      ))}
    </div>
  ),
}

export const SectionIconInContext: Story = {
  name: 'セクション見出し（実 UI 比較）',
  render: () => (
    <div
      style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: '1.25rem',
        alignItems: 'flex-start',
      }}
    >
      {sectionIconCandidates.map((candidate) => (
        <IconFrame key={candidate.id} label={candidate.label}>
          <SidebarStoryFrame>
            <BranchSection
              title="ブランチ"
              icon={candidate.icon}
              nodes={compositeLocal}
              selectedBranch="feature/hoge"
              checkedOutBranch="feature/hoge"
              worktreeBranches={compositeWorktreeBranches}
              showWorktreeMarks
              defaultExpanded
              onSelect={() => {}}
            />
          </SidebarStoryFrame>
        </IconFrame>
      ))}
    </div>
  ),
}

const rowIconCandidates = [
  {
    id: 'git-branch',
    label: 'GitBranchIcon',
    description: '通常のブランチ行',
    icon: <GitBranchIcon />,
  },
  {
    id: 'briefcase',
    label: 'BriefcaseIcon',
    description: 'ワークツリーありのブランチ行',
    icon: <BriefcaseIcon />,
  },
] as const

export const RowIconColors: Story = {
  name: '行アイコンの色（ブランチ / カバン）',
  render: () => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxWidth: 320 }}>
    <p style={{ margin: 0, fontSize: '0.8125rem', color: 'var(--color-slate-600)' }}>
      ブランチ行とワークツリー行でアイコン色が揃っているか確認用です。
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
        defaultExpanded
        onSelect={() => {}}
      />
    </SidebarStoryFrame>
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
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
          <span style={{ color: 'var(--color-slate-500)' }}>{candidate.icon}</span>
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
