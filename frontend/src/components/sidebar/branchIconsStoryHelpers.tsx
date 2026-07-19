import type { ReactNode } from 'react'

import sectionStyles from './BranchSection.module.css'

export function IconFrame({
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

export function SectionHeaderPreview({ icon, title }: { icon: ReactNode; title: string }) {
  return (
    <button type="button" className={sectionStyles.header}>
      <span className={sectionStyles.caret} aria-hidden />
      <span className={sectionStyles.sectionIcon}>{icon}</span>
      {title}
    </button>
  )
}

export function WorktreeRowPreview({ icon }: { icon: ReactNode }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '0.25rem',
        padding: '0.5rem 0.625rem',
        fontSize: '0.8125rem',
        color: 'var(--color-slate-900)',
      }}
    >
      <span
        style={{
          width: '0.875rem',
          height: '0.875rem',
          borderRadius: '999px',
          background: 'var(--color-blue-600)',
          flexShrink: 0,
        }}
      />
      <span style={{ display: 'inline-flex', color: 'var(--color-slate-900)', flexShrink: 0 }}>{icon}</span>
      <span style={{ fontWeight: 600, color: 'var(--color-blue-600)' }}>feature/hoge</span>
    </div>
  )
}
