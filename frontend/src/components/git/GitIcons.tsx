import type { ReactNode } from 'react'
import { cx } from '../../utils/cx'
import styles from './GitIcons.module.css'

const DEFAULT_SIZE = 14
const BADGE_PADDING = 1

export type GitArea = 'staged' | 'changes'

export type GitChangeType =
  | 'modified'
  | 'added'
  | 'deleted'
  | 'renamed'
  | 'untracked'
  | 'conflict'

interface IconBaseProps {
  size?: number
  className?: string
}

function badgeSizeFor(glyphSize: number): number {
  return glyphSize + BADGE_PADDING * 2
}

function IconBadge({
  variant,
  glyphSize = DEFAULT_SIZE,
  className,
  children,
}: {
  variant: GitArea | GitChangeType
  glyphSize?: number
  className?: string
  children: ReactNode
}) {
  const size = badgeSizeFor(glyphSize)
  return (
    <span
      className={cx(styles.badge, styles[variant], className)}
      style={{ width: size, height: size }}
    >
      {children}
    </span>
  )
}

function Svg({
  size = DEFAULT_SIZE,
  className,
  children,
}: IconBaseProps & { children: ReactNode }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      className={className}
    >
      {children}
    </svg>
  )
}

function StagedGlyph({ size, className }: IconBaseProps) {
  return (
    <Svg size={size} className={className}>
      <path
        d="M8 12.5l2.5 2.5L16 9.5"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  )
}

function ChangesGlyph({ size, className }: IconBaseProps) {
  return (
    <Svg size={size} className={className}>
      <path
        d="M9 13h4M9 17h6"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      <path
        d="M14 4H8a1.5 1.5 0 0 0-1.5 1.5v13A1.5 1.5 0 0 0 8 20h8a1.5 1.5 0 0 0 1.5-1.5V9L14 4z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path d="M14 4v5h5" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
    </Svg>
  )
}

function ModifiedGlyph({ size, className }: IconBaseProps) {
  return (
    <Svg size={size} className={className}>
      <path
        d="M12 19h8"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      <path
        d="M16.5 4.5a2 2 0 0 1 2.8 2.8L9 17l-3.5 1 1-3.5 10-10z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
    </Svg>
  )
}

function AddedGlyph({ size, className }: IconBaseProps) {
  return (
    <Svg size={size} className={className}>
      <path d="M12 8v8M8 12h8" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
    </Svg>
  )
}

function DeletedGlyph({ size, className }: IconBaseProps) {
  return (
    <Svg size={size} className={className}>
      <path d="M8 12h8" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
    </Svg>
  )
}

function RenamedGlyph({ size, className }: IconBaseProps) {
  return (
    <Svg size={size} className={className}>
      <path
        d="M6 12h8"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      <path
        d="M13 9l3 3-3 3"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M16 9h2a2 2 0 0 1 2 2v2"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  )
}

function UntrackedGlyph({ size, className }: IconBaseProps) {
  return (
    <Svg size={size} className={className}>
      <path
        d="M9.5 9.25a2.75 2.75 0 1 1 4.5 1.05c-.55.55-1.5 1-1.5 2.2"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      <circle cx="12" cy="17.5" r="0.9" fill="currentColor" />
    </Svg>
  )
}

function ConflictGlyph({ size, className }: IconBaseProps) {
  return (
    <Svg size={size} className={className}>
      <path
        d="M12 4.5L20 19H4L12 4.5z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path d="M12 10v4" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
      <circle cx="12" cy="16.5" r="0.9" fill="currentColor" />
    </Svg>
  )
}

const AREA_LABELS: Record<GitArea, string> = {
  staged: 'ステージ済み',
  changes: '変更',
}

const CHANGE_LABELS: Record<GitChangeType, string> = {
  modified: '変更',
  added: '新規',
  deleted: '削除',
  renamed: 'リネーム',
  untracked: '未追跡',
  conflict: '競合',
}

export function gitAreaAriaLabel(area: GitArea): string {
  return AREA_LABELS[area]
}

export function gitChangeAriaLabel(type: GitChangeType): string {
  return CHANGE_LABELS[type]
}

export function porcelainToChangeType(code: string): GitChangeType | null {
  if (code === ' ' || code === '') {
    return null
  }
  if (code === 'U') {
    return 'conflict'
  }
  if (code === '?') {
    return 'untracked'
  }
  if (code === 'M' || code === 'T') {
    return 'modified'
  }
  if (code === 'A' || code === 'N') {
    return 'added'
  }
  if (code === 'D') {
    return 'deleted'
  }
  if (code === 'R' || code === 'C') {
    return 'renamed'
  }
  return null
}

interface GitAreaIconProps extends IconBaseProps {
  area: GitArea
}

export function GitAreaIcon({ area, size = DEFAULT_SIZE, className }: GitAreaIconProps) {
  const glyphSize = size
  const Glyph = area === 'staged' ? StagedGlyph : ChangesGlyph
  return (
    <IconBadge variant={area} glyphSize={glyphSize} className={className}>
      <Glyph size={glyphSize} className={styles.glyph} />
    </IconBadge>
  )
}

interface GitChangeIconProps extends IconBaseProps {
  type: GitChangeType
}

export function GitChangeIcon({ type, size = DEFAULT_SIZE, className }: GitChangeIconProps) {
  const glyphSize = size
  const glyphClass = styles.glyph

  const glyph = (() => {
    switch (type) {
      case 'modified':
        return <ModifiedGlyph size={glyphSize} className={glyphClass} />
      case 'added':
        return <AddedGlyph size={glyphSize} className={glyphClass} />
      case 'deleted':
        return <DeletedGlyph size={glyphSize} className={glyphClass} />
      case 'renamed':
        return <RenamedGlyph size={glyphSize} className={glyphClass} />
      case 'untracked':
        return <UntrackedGlyph size={glyphSize} className={glyphClass} />
      case 'conflict':
        return <ConflictGlyph size={glyphSize} className={glyphClass} />
    }
  })()

  return (
    <IconBadge variant={type} glyphSize={glyphSize} className={className}>
      {glyph}
    </IconBadge>
  )
}

interface GitPorcelainIconProps extends IconBaseProps {
  code: string
}

export function GitPorcelainIcon({ code, size = DEFAULT_SIZE, className }: GitPorcelainIconProps) {
  const type = porcelainToChangeType(code)
  if (!type) {
    return null
  }
  return <GitChangeIcon type={type} size={size} className={className} />
}
