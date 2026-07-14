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
      <svg width="8" height="8" viewBox="0 0 16 16" fill="currentColor">
        <path d="M8 1.5 2.5 8.2h3.3V14.5h4.4V8.2h3.3L8 1.5Z" />
      </svg>
    </span>
  )
}

function DownArrowIcon() {
  return (
    <span className={styles.icon} aria-hidden="true">
      <svg width="8" height="8" viewBox="0 0 16 16" fill="currentColor">
        <path d="M8 14.5 13.5 7.8h-3.3V1.5H5.8v6.3H2.5L8 14.5Z" />
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
      {count}
      {showIcon && variant === 'behind' && <DownArrowIcon />}
    </span>
  )
}
