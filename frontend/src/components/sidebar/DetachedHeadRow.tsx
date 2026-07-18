import { formatDetachedHeadRowLabel } from '../../utils/detachedHead'
import { ActiveMark } from './ActiveMark'
import styles from './DetachedHeadRow.module.css'

interface DetachedHeadRowProps {
  head?: string | null
}

/** ブランチ一覧上の情報行（クリック不可） */
export function DetachedHeadRow({ head }: DetachedHeadRowProps) {
  return (
    <div className={styles.row} role="status" title="どのブランチにも属していません">
      <ActiveMark active title="detached HEAD" className={styles.activeMark} />
      <span className={styles.label}>{formatDetachedHeadRowLabel(head)}</span>
    </div>
  )
}
