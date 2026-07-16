import type { ButtonHTMLAttributes, ReactNode } from 'react'

import { cx } from '../../utils/cx'
import { CountBadge, type CountBadgeVariant } from '../ui/CountBadge'
import styles from './ToolbarActionButton.module.css'

interface ToolbarActionButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  label: string
  icon: ReactNode
  active?: boolean
  badgeCount?: number
  badgeVariant?: CountBadgeVariant
  showBadgeIcon?: boolean
  /** 件数なしの丸インジケータ（右上）。badgeCount より優先しない（数バッジがあるときは非表示）。 */
  showDot?: boolean
}

export function ToolbarActionButton({
  label,
  icon,
  active = false,
  badgeCount = 0,
  badgeVariant,
  showBadgeIcon = false,
  showDot = false,
  className,
  type = 'button',
  ...rest
}: ToolbarActionButtonProps) {
  const hasCountBadge = Boolean(badgeVariant && badgeCount > 0)

  return (
    <button
      type={type}
      className={cx(styles.button, active && styles.active, className)}
      aria-label={label}
      {...rest}
    >
      {hasCountBadge ? (
        <CountBadge
          count={badgeCount}
          variant={badgeVariant!}
          showIcon={showBadgeIcon}
          className={styles.badge}
        />
      ) : (
        showDot && <span className={styles.dot} aria-hidden="true" />
      )}
      <span className={styles.icon}>{icon}</span>
      <span className={styles.label}>{label}</span>
    </button>
  )
}
