import { useState, type ReactNode } from 'react'

import { ChevronDownIcon, ChevronRightIcon } from './BranchIcons'
import styles from './BranchSection.module.css'

interface SidebarSectionProps {
  title: string
  icon: ReactNode
  children: ReactNode
  defaultExpanded?: boolean
}

export function SidebarSection({
  title,
  icon,
  children,
  defaultExpanded = true,
}: SidebarSectionProps) {
  const [expanded, setExpanded] = useState(defaultExpanded)

  return (
    <section className={styles.section}>
      <button
        type="button"
        className={styles.header}
        onClick={() => setExpanded((value) => !value)}
      >
        <span className={styles.caret}>
          {expanded ? <ChevronDownIcon /> : <ChevronRightIcon />}
        </span>
        <span className={styles.sectionIcon}>{icon}</span>
        {title}
      </button>
      {expanded && <div className={styles.body}>{children}</div>}
    </section>
  )
}
