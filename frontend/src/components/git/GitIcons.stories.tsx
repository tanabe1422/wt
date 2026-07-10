import type { Meta, StoryObj } from '@storybook/react-vite'
import {
  GitAreaIcon,
  GitChangeIcon,
  GitPorcelainIcon,
  gitAreaAriaLabel,
  gitChangeAriaLabel,
  porcelainToChangeType,
  type GitArea,
  type GitChangeType,
} from './GitIcons'

const meta = {
  title: 'Git/GitIcons',
  component: GitChangeIcon,
  args: { type: 'modified' as const },
} satisfies Meta<typeof GitChangeIcon>

export default meta
type Story = StoryObj<typeof meta>

const AREAS: GitArea[] = ['staged', 'changes']
const CHANGE_TYPES: GitChangeType[] = [
  'modified',
  'added',
  'deleted',
  'renamed',
  'untracked',
  'conflict',
]
const PORCELAIN_CODES = ['M', 'A', 'D', 'R', '?', 'U', ' '] as const

function IconGrid({
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
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(7rem, 1fr))',
          gap: '0.75rem',
        }}
      >
        {children}
      </div>
    </section>
  )
}

function IconCell({
  label,
  sublabel,
  children,
}: {
  label: string
  sublabel?: string
  children: React.ReactNode
}) {
  return (
    <div
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
      {children}
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--color-slate-700)' }}>
          {label}
        </div>
        {sublabel && (
          <div style={{ fontSize: '0.75rem', color: 'var(--color-slate-500)' }}>{sublabel}</div>
        )}
      </div>
    </div>
  )
}

export const AllIcons: Story = {
  render: () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', padding: '1rem' }}>
      <IconGrid title="エリア（ステージ / 変更）">
        {AREAS.map((area) => (
          <IconCell key={area} label={gitAreaAriaLabel(area)} sublabel={area}>
            <GitAreaIcon area={area} />
          </IconCell>
        ))}
      </IconGrid>

      <IconGrid title="変更種別（変更・リネームは同色、形状で区別）">
        {CHANGE_TYPES.map((type) => (
          <IconCell key={type} label={gitChangeAriaLabel(type)} sublabel={type}>
            <GitChangeIcon type={type} />
          </IconCell>
        ))}
      </IconGrid>

      <IconGrid title="Porcelain コード対応">
        {PORCELAIN_CODES.map((code) => {
          const type = porcelainToChangeType(code)
          return (
            <IconCell
              key={code}
              label={code === ' ' ? '(空白)' : code}
              sublabel={type ? gitChangeAriaLabel(type) : '表示なし'}
            >
              {type ? <GitPorcelainIcon code={code} /> : <span style={{ width: 20, height: 20 }} />}
            </IconCell>
          )
        })}
      </IconGrid>
    </div>
  ),
}

export const Modified: Story = {
  args: { type: 'modified' },
}

export const Added: Story = {
  args: { type: 'added' },
}

export const Deleted: Story = {
  args: { type: 'deleted' },
}

export const Renamed: Story = {
  args: { type: 'renamed' },
}

export const Untracked: Story = {
  args: { type: 'untracked' },
}

export const Conflict: Story = {
  name: '競合',
  args: { type: 'conflict' },
}

export const StagedArea: Story = {
  render: () => <GitAreaIcon area="staged" />,
}

export const ChangesArea: Story = {
  render: () => <GitAreaIcon area="changes" />,
}

export const InFileRow: Story = {
  render: () => (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '1px',
        width: 320,
        border: '1px solid var(--color-slate-200)',
        borderRadius: '0.375rem',
        overflow: 'hidden',
        background: 'var(--color-surface-main)',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          padding: '0.5rem 0.75rem',
          background: 'var(--color-surface-header)',
          borderBottom: '1px solid var(--color-slate-200)',
          fontSize: '0.8125rem',
          fontWeight: 600,
          color: 'var(--color-slate-700)',
        }}
      >
        <GitAreaIcon area="staged" />
        ステージ済み
      </div>
      {[
        { type: 'modified' as const, path: 'src/app.tsx' },
        { type: 'added' as const, path: 'src/new-file.ts' },
      ].map((row) => (
        <div
          key={row.path}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.375rem 0.75rem',
            borderBottom: '1px solid var(--color-slate-200)',
          }}
        >
          <GitChangeIcon type={row.type} />
          <span style={{ fontSize: '0.875rem' }}>
            {row.path}
          </span>
        </div>
      ))}

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          padding: '0.5rem 0.75rem',
          background: 'var(--color-surface-header)',
          borderBottom: '1px solid var(--color-slate-200)',
          fontSize: '0.8125rem',
          fontWeight: 600,
          color: 'var(--color-slate-700)',
        }}
      >
        <GitAreaIcon area="changes" />
        変更
      </div>
      {[
        { type: 'deleted' as const, path: 'old/util.ts' },
        { type: 'renamed' as const, path: 'src/renamed.ts' },
        { type: 'untracked' as const, path: 'notes.md' },
        { type: 'conflict' as const, path: 'src/conflict.ts' },
      ].map((row) => (
        <div
          key={row.path}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.375rem 0.75rem',
            borderBottom: '1px solid var(--color-slate-200)',
          }}
        >
          <GitChangeIcon type={row.type} />
          <span style={{ fontSize: '0.875rem' }}>
            {row.path}
          </span>
        </div>
      ))}
    </div>
  ),
}
