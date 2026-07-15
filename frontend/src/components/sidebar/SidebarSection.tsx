import { useCallback, useReducer, useState, type ReactNode } from 'react'

import { getSidebarExpanded, setSidebarExpanded } from '../../lib/sidebarExpansionStore'
import { ChevronDownIcon, ChevronRightIcon } from './BranchIcons'
import styles from './BranchSection.module.css'

interface SidebarSectionProps {
  title: string
  icon: ReactNode
  children: ReactNode
  defaultExpanded?: boolean
  /** リポジトリ単位で展開状態を保持するキー（未指定時はローカルのみ） */
  storageKey?: string | null
}

export function SidebarSection({
  title,
  icon,
  children,
  defaultExpanded = true,
  storageKey = null,
}: SidebarSectionProps) {
  const [, bump] = useReducer((version: number) => version + 1, 0)
  const [localExpanded, setLocalExpanded] = useState(defaultExpanded)

  const setExpanded = useCallback(
    (value: boolean | ((prev: boolean) => boolean)) => {
      if (storageKey) {
        const prev = getSidebarExpanded(storageKey) ?? defaultExpanded
        const next = typeof value === 'function' ? value(prev) : value
        setSidebarExpanded(storageKey, next)
        bump()
        return
      }
      setLocalExpanded(value)
    },
    [storageKey, defaultExpanded],
  )

  const expanded = storageKey
    ? (getSidebarExpanded(storageKey) ?? defaultExpanded)
    : localExpanded

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
