import type { Meta, StoryObj } from '@storybook/react-vite'
import { CountBadge, type CountBadgeVariant } from './CountBadge'

const meta = {
  title: 'UI/CountBadge',
  component: CountBadge,
  args: {
    count: 23,
    variant: 'ahead',
  },
  argTypes: {
    variant: {
      control: 'select',
      options: ['ahead', 'behind', 'changes'] satisfies CountBadgeVariant[],
    },
  },
} satisfies Meta<typeof CountBadge>

export default meta
type Story = StoryObj<typeof meta>

const VARIANTS: { variant: CountBadgeVariant; title: string; description: string }[] = [
  {
    variant: 'ahead',
    title: 'プッシュ待ち（↑ 左）',
    description: 'リモートより先行しているコミット数（矢印は左側）',
  },
  {
    variant: 'behind',
    title: 'プル待ち（↓ 右）',
    description: 'リモートより遅れているコミット数（矢印は右側）',
  },
  {
    variant: 'changes',
    title: '変更ファイル数',
    description: '未コミットの変更ファイル数（ワークツリー）',
  },
]

const SAMPLE_COUNTS = [1, 5, 23, 99, 150]

function ShowcaseGrid({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <section style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
      <h3
        style={{
          margin: 0,
          fontSize: '0.875rem',
          fontWeight: 600,
          color: 'var(--color-slate-700)',
        }}
      >
        {title}
      </h3>
      {children}
    </section>
  )
}

export const Ahead: Story = {
  args: { variant: 'ahead', count: 23 },
}

export const Behind: Story = {
  args: { variant: 'behind', count: 23 },
}

export const Changes: Story = {
  args: { variant: 'changes', count: 5 },
}

export const AllVariants: Story = {
  render: () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', padding: '1rem' }}>
      <ShowcaseGrid title="バリアント">
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem' }}>
          {VARIANTS.map(({ variant, title, description }) => (
            <div
              key={variant}
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
              <CountBadge count={23} variant={variant} />
              <div style={{ textAlign: 'center' }}>
                <div
                  style={{
                    fontSize: '0.8125rem',
                    fontWeight: 600,
                    color: 'var(--color-slate-700)',
                  }}
                >
                  {title}
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--color-slate-500)' }}>
                  {description}
                </div>
              </div>
            </div>
          ))}
        </div>
      </ShowcaseGrid>

      <ShowcaseGrid title="件数の見え方">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {VARIANTS.map(({ variant, title }) => (
            <div
              key={variant}
              style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}
            >
              <span
                style={{
                  width: '8rem',
                  fontSize: '0.75rem',
                  color: 'var(--color-slate-500)',
                }}
              >
                {title}
              </span>
              {SAMPLE_COUNTS.map((count) => (
                <CountBadge key={count} count={count} variant={variant} />
              ))}
            </div>
          ))}
        </div>
      </ShowcaseGrid>
    </div>
  ),
}

function SidebarRow({
  icon,
  label,
  sublabel,
  badges,
}: {
  icon: React.ReactNode
  label: string
  sublabel?: string
  badges?: React.ReactNode
}) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '0.375rem',
        padding: '0.375rem 0.5rem',
        minWidth: 0,
      }}
    >
      <span style={{ flexShrink: 0, color: 'var(--color-slate-400)' }}>{icon}</span>
      <span style={{ display: 'flex', flexDirection: 'column', minWidth: 0, flex: 1 }}>
        <span
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.375rem',
            minWidth: 0,
          }}
        >
          <span
            style={{
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              fontSize: '0.8125rem',
            }}
          >
            {label}
          </span>
          {badges}
        </span>
        {sublabel && (
          <span
            style={{
              fontSize: '0.75rem',
              color: 'var(--color-slate-500)',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {sublabel}
          </span>
        )}
      </span>
    </div>
  )
}

function BranchIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
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

function FolderIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M3 7a2 2 0 0 1 2-2h5l2 2h9a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export const InSidebarContext: Story = {
  render: () => (
    <div
      style={{
        width: 280,
        border: '1px solid var(--color-slate-200)',
        borderRadius: '0.375rem',
        overflow: 'hidden',
        background: 'var(--color-surface-main)',
      }}
    >
      <div
        style={{
          padding: '0.5rem 0.75rem',
          fontSize: '0.75rem',
          fontWeight: 600,
          color: 'var(--color-slate-500)',
          background: 'var(--color-surface-header)',
          borderBottom: '1px solid var(--color-slate-200)',
        }}
      >
        ブランチ
      </div>
      <SidebarRow
        icon={<BranchIcon />}
        label="feature/sync-badge"
        badges={
          <>
            <CountBadge count={5} variant="behind" />
            <CountBadge count={23} variant="ahead" />
          </>
        }
      />
      <SidebarRow
        icon={<BranchIcon />}
        label="main"
        badges={<CountBadge count={3} variant="behind" />}
      />
      <SidebarRow icon={<BranchIcon />} label="develop" badges={<CountBadge count={12} variant="ahead" />} />

      <div
        style={{
          padding: '0.5rem 0.75rem',
          fontSize: '0.75rem',
          fontWeight: 600,
          color: 'var(--color-slate-500)',
          background: 'var(--color-surface-header)',
          borderTop: '1px solid var(--color-slate-200)',
          borderBottom: '1px solid var(--color-slate-200)',
        }}
      >
        ワークツリー
      </div>
      <SidebarRow
        icon={<FolderIcon />}
        label="wt-manager"
        sublabel="main"
        badges={<CountBadge count={7} variant="changes" />}
      />
      <SidebarRow icon={<FolderIcon />} label="wt-manager-feature" sublabel="feature/sync-badge" />
    </div>
  ),
}
