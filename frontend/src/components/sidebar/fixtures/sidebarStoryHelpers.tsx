import type { ReactNode } from 'react'

import styles from '../BranchSidebar.module.css'

export function SidebarStoryFrame({ children }: { children: ReactNode }) {
  return (
    <div
      className={styles.panel}
      style={{
        width: 280,
        height: 480,
        border: '1px solid var(--color-slate-200)',
        borderRadius: '0.375rem',
        overflow: 'hidden',
        background: 'var(--color-surface-main)',
      }}
    >
      <div className={styles.scroll}>{children}</div>
    </div>
  )
}

export function noop() {}
