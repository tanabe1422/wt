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
}

export function ToolbarActionButton({
  label,
  icon,
  active = false,
  badgeCount = 0,
  badgeVariant,
  showBadgeIcon = false,
  className,
  type = 'button',
  ...rest
}: ToolbarActionButtonProps) {
  return (
    <button
      type={type}
      className={cx(styles.button, active && styles.active, className)}
      aria-label={label}
      {...rest}
    >
      {badgeVariant && badgeCount > 0 && (
        <CountBadge
          count={badgeCount}
          variant={badgeVariant}
          showIcon={showBadgeIcon}
          className={styles.badge}
        />
      )}
      <span className={styles.icon}>{icon}</span>
      <span className={styles.label}>{label}</span>
    </button>
  )
}
