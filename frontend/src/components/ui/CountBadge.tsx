import { cx } from '../../utils/cx'
import styles from './CountBadge.module.css'

export type CountBadgeVariant = 'ahead' | 'behind' | 'changes'

export interface CountBadgeProps {
  count: number
  variant: CountBadgeVariant
  className?: string
  showIcon?: boolean
}

function UpArrowIcon() {
  return (
    <span className={styles.icon} aria-hidden="true">
      <svg width="9" height="9" viewBox="0 0 24 24" fill="none">
        <path
          d="M12 19V5M12 5l-6 6M12 5l6 6"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </span>
  )
}

function DownArrowIcon() {
  return (
    <span className={styles.icon} aria-hidden="true">
      <svg width="9" height="9" viewBox="0 0 24 24" fill="none">
        <path
          d="M12 5v14M12 19l-6-6M12 19l6-6"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </span>
  )
}

function ariaLabel(count: number, variant: CountBadgeVariant): string {
  switch (variant) {
    case 'ahead':
      return `プッシュしていないコミット ${count} 件`
    case 'behind':
      return `プルしていないコミット ${count} 件`
    case 'changes':
      return `未コミットの変更ファイル ${count} 件`
  }
}

export function CountBadge({ count, variant, className, showIcon = true }: CountBadgeProps) {
  if (count <= 0) {
    return null
  }

  return (
    <span className={cx(styles.badge, className)} aria-label={ariaLabel(count, variant)}>
      {showIcon && variant === 'ahead' && <UpArrowIcon />}
      {showIcon && variant === 'behind' && <DownArrowIcon />}
      {count}
    </span>
  )
}
