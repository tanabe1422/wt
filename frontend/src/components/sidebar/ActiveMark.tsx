import { cx } from '../../utils/cx'
import styles from './ActiveMark.module.css'

interface ActiveMarkProps {
  active: boolean
  title?: string
  className?: string
}

function ActiveDotIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
      <circle cx="7" cy="7" r="3.25" fill="currentColor" />
    </svg>
  )
}

export function ActiveMark({ active, title, className }: ActiveMarkProps) {
  return (
    <span className={cx(styles.wrap, className)} title={title}>
      {active ? <ActiveDotIcon /> : <span className={styles.placeholder} aria-hidden="true" />}
    </span>
  )
}
