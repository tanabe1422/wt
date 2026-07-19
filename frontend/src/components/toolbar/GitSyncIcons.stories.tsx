import type { Meta, StoryObj } from '@storybook/react-vite'
import type { ReactNode } from 'react'

import { IconButton } from '../ui/IconButton'
import { GitSyncActionButton } from './GitSyncActionButton'
import {
  GitSyncIcon,
  RemoteCleanupIcon,
  gitSyncActionLabel,
  type GitSyncAction,
} from './GitSyncIcons'
import { ToolbarActionButton } from './ToolbarActionButton'
import { SIDEBAR_SECTION_ICON_SIZE } from '../sidebar/BranchIcons'
import toolbarStyles from './GitSyncToolbar.module.css'

const ACTIONS: GitSyncAction[] = ['pull', 'push', 'fetch']

const meta = {
  title: 'Toolbar/GitSyncIcons',
  component: GitSyncIcon,
  args: {
    action: 'pull' as const,
  },
  argTypes: {
    action: {
      control: 'select',
      options: ACTIONS,
    },
  },
} satisfies Meta<typeof GitSyncIcon>

export default meta
type Story = StoryObj<typeof meta>

function IconCell({
  action,
  description,
}: {
  action: GitSyncAction
  description: string
}) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '0.5rem',
        padding: '0.75rem 1rem',
        border: '1px solid var(--color-slate-200)',
        borderRadius: '0.375rem',
        background: 'var(--color-white)',
        minWidth: '7rem',
      }}
    >
      <GitSyncIcon action={action} size={24} />
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--color-slate-700)' }}>
          {gitSyncActionLabel(action)}
        </div>
        <div style={{ fontSize: '0.75rem', color: 'var(--color-slate-500)' }}>{description}</div>
      </div>
    </div>
  )
}

export const Pull: Story = {
  args: { action: 'pull' },
}

export const Push: Story = {
  args: { action: 'push' },
}

export const Fetch: Story = {
  args: { action: 'fetch' },
}

export const AllIcons: Story = {
  render: () => (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', padding: '1rem' }}>
      <IconCell action="pull" description="下矢印 — リモートから取り込む" />
      <IconCell action="push" description="上矢印 — リモートへ送る" />
      <IconCell action="fetch" description="回転矢印 — リモート情報を更新" />
    </div>
  ),
}

export const AsButtons: Story = {
  render: () => (
    <div
      style={{
        display: 'flex',
        gap: '0.125rem',
        padding: '0.5rem',
        background: 'var(--color-surface-header)',
        border: '1px solid var(--color-slate-200)',
        borderRadius: '0.375rem',
        width: 'fit-content',
      }}
    >
      {ACTIONS.map((action) => (
        <GitSyncActionButton key={action} action={action} />
      ))}
    </div>
  ),
}

/* —— 整理（不要なものを削除）アイコン候補 —— */

function iconSizeProps(size: number) {
  return { width: size, height: size, viewBox: '0 0 24 24', fill: 'none', 'aria-hidden': true as const }
}

/** 旧: ゴミ箱 + ほうき */
function TrashBroomIcon({ size = 20 }: { size?: number }) {
  return (
    <svg {...iconSizeProps(size)}>
      <path d="M4 7h12" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
      <path
        d="M6 7v11a2 2 0 0 0 2 2h4a2 2 0 0 0 2-2V7"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M9 7V5a1 1 0 0 1 1-1h0a1 1 0 0 1 1 1v2"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M15.5 11.5 20 16l-1.5 1.5-4.5-4.5"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M18.5 13.5 20 12l2 2-1.5 1.5"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

/** ゴミ箱のみ */
function TrashIcon({ size = 20 }: { size?: number }) {
  return (
    <svg {...iconSizeProps(size)}>
      <path d="M4 7h16" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
      <path
        d="M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M6 7v12a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V7"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M10 11v6M14 11v6" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
    </svg>
  )
}

/** ほうきのみ */
function BroomIcon({ size = 20 }: { size?: number }) {
  return (
    <svg {...iconSizeProps(size)}>
      <path
        d="M8 21 16.5 8.5"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
      <path
        d="M14.5 6.5 17.5 9.5"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
      <path
        d="M5 21c0-2.5 1.5-4 4-5.5L7 21H5zM9 15.5 14 21H8l1-5.5z"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinejoin="round"
      />
      <path
        d="M16.5 8.5c1.2-1.8 3.2-2.8 5-2.2"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
    </svg>
  )
}

/** はさみ（prune 感） */
function ScissorsIcon({ size = 20 }: { size?: number }) {
  return (
    <svg {...iconSizeProps(size)}>
      <circle cx="7" cy="7" r="2.5" stroke="currentColor" strokeWidth="1.75" />
      <circle cx="7" cy="17" r="2.5" stroke="currentColor" strokeWidth="1.75" />
      <path
        d="M9.2 8.5 20 18M9.2 15.5 20 6"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
    </svg>
  )
}

/** 消しゴム */
function EraserIcon({ size = 20 }: { size?: number }) {
  return (
    <svg {...iconSizeProps(size)}>
      <path
        d="m7 15 8.5-8.5a2 2 0 0 1 2.8 0l1.2 1.2a2 2 0 0 1 0 2.8L11 19H7v-4z"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinejoin="round"
      />
      <path d="M5 19h14" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
    </svg>
  )
}

/** フィルター（不要を落とす） */
function FilterIcon({ size = 20 }: { size?: number }) {
  return (
    <svg {...iconSizeProps(size)}>
      <path
        d="M4 5h16l-6 7v5l-4 2v-7L4 5z"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinejoin="round"
      />
    </svg>
  )
}

/** リスト + X */
function ListXIcon({ size = 20 }: { size?: number }) {
  return (
    <svg {...iconSizeProps(size)}>
      <path d="M4 7h9M4 12h9M4 17h6" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
      <path
        d="m15 14 5 5M20 14l-5 5"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
    </svg>
  )
}

/** ブランチ + X（ブランチ削除） */
function BranchXIcon({ size = 20 }: { size?: number }) {
  return (
    <svg {...iconSizeProps(size)}>
      <circle cx="6" cy="6" r="2.25" stroke="currentColor" strokeWidth="1.75" />
      <circle cx="6" cy="18" r="2.25" stroke="currentColor" strokeWidth="1.75" />
      <path d="M6 8.5v7" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
      <path
        d="M8.3 6H11a3.5 3.5 0 0 1 3.5 3.5V11"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
      <path
        d="m14.5 14.5 5 5M19.5 14.5l-5 5"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
    </svg>
  )
}

/** クラウド + ゴミ箱（リモート整理） */
function CloudTrashIcon({ size = 20 }: { size?: number }) {
  return (
    <svg {...iconSizeProps(size)}>
      <path
        d="M7 14h9a3.5 3.5 0 0 0 .35-7 4.5 4.5 0 0 0-8.7 1.5A3 3 0 0 0 7 14z"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinejoin="round"
      />
      <path d="M10 17h7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path
        d="M11.5 17v4.5a1 1 0 0 0 1 1h3a1 1 0 0 0 1-1V17"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path
        d="M12.5 17v-1a1 1 0 0 1 1-1h1a1 1 0 0 1 1 1v1"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    </svg>
  )
}

/** クラウド + ほうき */
function CloudBroomIcon({ size = 20 }: { size?: number }) {
  return (
    <svg {...iconSizeProps(size)}>
      <path
        d="M6 13h10a3.5 3.5 0 0 0 .35-7 4.5 4.5 0 0 0-8.7 1.5A3 3 0 0 0 6 13z"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinejoin="round"
      />
      <path
        d="M11 21 16.5 12.5"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
      <path
        d="M15 11l2.5 2.5"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
      <path
        d="M9.5 21c0-1.8 1-2.8 2.8-4L11 21H9.5z"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinejoin="round"
      />
    </svg>
  )
}

/** リサイクル */
function RecycleIcon({ size = 20 }: { size?: number }) {
  return (
    <svg {...iconSizeProps(size)}>
      <path
        d="M7 19H4.5L7 14.5"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M7 14.5A7 7 0 0 1 17.5 8"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
      <path
        d="M17 5h2.5L17 9.5"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M17 9.5A7 7 0 0 1 6.5 16"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
      <path
        d="M9.5 20.5 12 18l2.5 2.5"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

/** スパークル（きれいにする） */
function SparklesIcon({ size = 20 }: { size?: number }) {
  return (
    <svg {...iconSizeProps(size)}>
      <path
        d="M12 3v4M12 17v4M3 12h4M17 12h4M6.2 6.2l2.8 2.8M15 15l2.8 2.8M17.8 6.2 15 9M9 15l-2.8 2.8"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
      <circle cx="12" cy="12" r="2.25" stroke="currentColor" strokeWidth="1.75" />
    </svg>
  )
}

/** ブラシ */
function BrushIcon({ size = 20 }: { size?: number }) {
  return (
    <svg {...iconSizeProps(size)}>
      <path
        d="M9.5 15.5 18 7l2 2-8.5 8.5-3 1 1.5-3.5z"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinejoin="round"
      />
      <path
        d="M16.5 8.5 18.5 6.5"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
      <path
        d="M7 18c-1.5 0-2.5 1-2.5 2.5S6 21 7 21s2-.8 2-2"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
    </svg>
  )
}

/** マイナス丸（削除・除外） */
function MinusCircleIcon({ size = 20 }: { size?: number }) {
  return (
    <svg {...iconSizeProps(size)}>
      <circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="1.75" />
      <path d="M8.5 12h7" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
    </svg>
  )
}

/** アーカイブ箱 */
function ArchiveIcon({ size = 20 }: { size?: number }) {
  return (
    <svg {...iconSizeProps(size)}>
      <rect x="3" y="4" width="18" height="4" rx="1" stroke="currentColor" strokeWidth="1.75" />
      <path
        d="M5 8v10a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinejoin="round"
      />
      <path d="M10 12h4" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
    </svg>
  )
}

/** 剪定ばさみ（枝を切る） */
function PruneShearsIcon({ size = 20 }: { size?: number }) {
  return (
    <svg {...iconSizeProps(size)}>
      <path
        d="M5 19c2-4 5-7 9-9"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
      <path d="M14 10 18 6" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
      <path d="M14 10l4 4" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
      <circle cx="6.5" cy="6.5" r="2.25" stroke="currentColor" strokeWidth="1.75" />
      <circle cx="17.5" cy="17.5" r="2.25" stroke="currentColor" strokeWidth="1.75" />
      <path
        d="M8.3 8 15.5 15.5"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
    </svg>
  )
}

/** 掃除スプレー */
function SprayCleanIcon({ size = 20 }: { size?: number }) {
  return (
    <svg {...iconSizeProps(size)}>
      <path
        d="M9 10h6v9a2 2 0 0 1-2 2h-2a2 2 0 0 1-2-2v-9z"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinejoin="round"
      />
      <path
        d="M10 10V7a2 2 0 0 1 2-2h0a2 2 0 0 1 2 2v3"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinejoin="round"
      />
      <path d="M12 5V3" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
      <path
        d="M16 4.5h2M16.5 7H19M17 2.5l1.5-1"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  )
}

/** チェックリスト管理 */
function ClipboardCheckIcon({ size = 20 }: { size?: number }) {
  return (
    <svg {...iconSizeProps(size)}>
      <path
        d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinejoin="round"
      />
      <rect x="9" y="3" width="6" height="4" rx="1" stroke="currentColor" strokeWidth="1.75" />
      <path
        d="m9 13 2 2 4-4"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

/** スタックから1枚除去 */
function LayersMinusIcon({ size = 20 }: { size?: number }) {
  return (
    <svg {...iconSizeProps(size)}>
      <path
        d="m12 3 8 4.5-8 4.5-8-4.5L12 3z"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinejoin="round"
      />
      <path
        d="m4 13 8 4.5 4-2.25"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="m4 17.5 5 2.8"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
      <path d="M15 16h5" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
    </svg>
  )
}

type CleanupCandidate = {
  id: string
  label: string
  description: string
  icon: (size: number) => ReactNode
}

const cleanupIconCandidates: CleanupCandidate[] = [
  {
    id: 'list-minus',
    label: 'ListMinus（採用）',
    description: '一覧から項目を減らす。リモート／ローカル整理で使用中',
    icon: (size) => <RemoteCleanupIcon size={size} />,
  },
  {
    id: 'trash-broom',
    label: 'TrashBroom（旧）',
    description: 'ゴミ箱＋ほうき。削除と掃除の複合。やや情報量が多い',
    icon: (size) => <TrashBroomIcon size={size} />,
  },
  {
    id: 'trash',
    label: 'Trash',
    description: '削除の定番。破壊感が強い',
    icon: (size) => <TrashIcon size={size} />,
  },
  {
    id: 'broom',
    label: 'Broom',
    description: '掃除・整理。削除より「きれいにする」寄り',
    icon: (size) => <BroomIcon size={size} />,
  },
  {
    id: 'scissors',
    label: 'Scissors',
    description: '剪定・prune。余分な枝を切る',
    icon: (size) => <ScissorsIcon size={size} />,
  },
  {
    id: 'prune-shears',
    label: 'PruneShears',
    description: '枝＋はさみ。ブランチ剪定の比喩',
    icon: (size) => <PruneShearsIcon size={size} />,
  },
  {
    id: 'branch-x',
    label: 'BranchX',
    description: 'ブランチ削除そのもの。ローカル整理向き',
    icon: (size) => <BranchXIcon size={size} />,
  },
  {
    id: 'cloud-trash',
    label: 'CloudTrash',
    description: 'リモート＋削除。リモート整理に直結',
    icon: (size) => <CloudTrashIcon size={size} />,
  },
  {
    id: 'cloud-broom',
    label: 'CloudBroom',
    description: 'リモート＋掃除。削除より整理寄り',
    icon: (size) => <CloudBroomIcon size={size} />,
  },
  {
    id: 'eraser',
    label: 'Eraser',
    description: '消す・取り消す。ソフトな削除',
    icon: (size) => <EraserIcon size={size} />,
  },
  {
    id: 'filter',
    label: 'Filter',
    description: '不要を落とす。除外リスト管理とも相性',
    icon: (size) => <FilterIcon size={size} />,
  },
  {
    id: 'list-x',
    label: 'ListX',
    description: '一覧から除外・削除',
    icon: (size) => <ListXIcon size={size} />,
  },
  {
    id: 'layers-minus',
    label: 'LayersMinus',
    description: '積み重ねから1つ除去',
    icon: (size) => <LayersMinusIcon size={size} />,
  },
  {
    id: 'minus-circle',
    label: 'MinusCircle',
    description: '除去・無効化。シンプルだが抽象的',
    icon: (size) => <MinusCircleIcon size={size} />,
  },
  {
    id: 'archive',
    label: 'Archive',
    description: '片付けてしまう。削除より退避',
    icon: (size) => <ArchiveIcon size={size} />,
  },
  {
    id: 'recycle',
    label: 'Recycle',
    description: '再利用・循環。削除感は弱い',
    icon: (size) => <RecycleIcon size={size} />,
  },
  {
    id: 'sparkles',
    label: 'Sparkles',
    description: 'クリーンアップ・すっきり',
    icon: (size) => <SparklesIcon size={size} />,
  },
  {
    id: 'brush',
    label: 'Brush',
    description: '掃き清める。ほうきに近い',
    icon: (size) => <BrushIcon size={size} />,
  },
  {
    id: 'spray',
    label: 'SprayClean',
    description: '洗浄・クリーン。やや比喩的',
    icon: (size) => <SprayCleanIcon size={size} />,
  },
  {
    id: 'clipboard-check',
    label: 'ClipboardCheck',
    description: '管理・確認寄り。削除感は薄い',
    icon: (size) => <ClipboardCheckIcon size={size} />,
  },
]

function CleanupCandidateCard({ candidate }: { candidate: CleanupCandidate }) {
  return (
    <figure
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '0.5rem',
        margin: 0,
        width: 220,
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
        <div
          className={toolbarStyles.bar}
          style={{
            display: 'flex',
            justifyContent: 'flex-end',
            padding: '0.375rem 0.5rem',
            borderBottom: '1px solid var(--color-slate-200)',
          }}
        >
          <ToolbarActionButton label="リモート整理" icon={candidate.icon(20)} />
        </div>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.375rem',
            padding: '0.5rem 0.625rem',
            fontSize: '0.8125rem',
            color: 'var(--color-slate-700)',
            borderBottom: '1px solid var(--color-slate-200)',
          }}
        >
          <span style={{ fontWeight: 600 }}>ブランチ</span>
          <IconButton size="sm" title="ブランチの整理" aria-label="ブランチの整理">
            {candidate.icon(SIDEBAR_SECTION_ICON_SIZE)}
          </IconButton>
        </div>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '1.25rem',
            padding: '0.875rem',
            color: 'var(--color-slate-700)',
          }}
        >
          <span style={{ display: 'inline-flex' }}>{candidate.icon(24)}</span>
          <span style={{ display: 'inline-flex', opacity: 0.7 }}>{candidate.icon(18)}</span>
          <span style={{ display: 'inline-flex', opacity: 0.55 }}>{candidate.icon(14)}</span>
        </div>
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
        <strong style={{ color: 'var(--color-slate-800)' }}>{candidate.label}</strong>
        <span>{candidate.description}</span>
      </figcaption>
    </figure>
  )
}

export const CleanupIconCandidates: Story = {
  name: '整理（不要削除）アイコン候補',
  render: () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', padding: '0.5rem' }}>
      <p style={{ margin: 0, fontSize: '0.8125rem', color: 'var(--color-slate-600)', maxWidth: 720 }}>
        リモート整理・ローカルブランチ整理で使う「管理（いらないものを削除）」のアイコン候補。
        上段はツールバーボタン、中段はサイドバー見出しの小ボタン、下段は 24 / 18 / 14px の単体表示。
      </p>
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '1.25rem',
          alignItems: 'flex-start',
        }}
      >
        {cleanupIconCandidates.map((candidate) => (
          <CleanupCandidateCard key={candidate.id} candidate={candidate} />
        ))}
      </div>
    </div>
  ),
}
