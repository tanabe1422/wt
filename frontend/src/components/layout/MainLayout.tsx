import type { ReactNode } from 'react'

import { ToastRoot } from '../../hooks/useToast'
import { CollapsibleSidebar, SidebarProvider } from './CollapsibleSidebar'
import styles from './MainLayout.module.css'

interface MainLayoutProps {
  sidebar: ReactNode
  children: ReactNode
  toolbar?: ReactNode
  workspaceToolbar?: ReactNode
  busy?: boolean
}

export function MainLayout({
  sidebar,
  children,
  toolbar,
  workspaceToolbar,
  busy = false,
}: MainLayoutProps) {
  return (
    <SidebarProvider>
      <div className={styles.shell}>
        {toolbar}
        {workspaceToolbar}
        <div className={styles.body} aria-busy={busy || undefined}>
          <CollapsibleSidebar>{sidebar}</CollapsibleSidebar>
          <main className={styles.main}>
            {children}
            <ToastRoot />
          </main>
          {busy && (
            <div className={styles.busyOverlay} role="status" aria-live="polite" aria-label="更新中">
              <span className={styles.spinner} aria-hidden="true" />
            </div>
          )}
        </div>
      </div>
    </SidebarProvider>
  )
}
