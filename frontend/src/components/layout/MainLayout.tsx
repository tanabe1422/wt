import type { ReactNode } from 'react'

import { ToastRoot } from '../../hooks/useToast'
import { BusyProgressText, type BusyMessageAppearance } from './BusyProgressText'
import { CollapsibleSidebar, SidebarProvider } from './CollapsibleSidebar'
import styles from './MainLayout.module.css'

interface MainLayoutProps {
  sidebar: ReactNode
  children: ReactNode
  toolbar?: ReactNode
  workspaceToolbar?: ReactNode
  busy?: boolean
  busyMessage?: string
  busyMessageAppearance?: BusyMessageAppearance
}

export function MainLayout({
  sidebar,
  children,
  toolbar,
  workspaceToolbar,
  busy = false,
  busyMessage = '',
  busyMessageAppearance = 'chip',
}: MainLayoutProps) {
  return (
    <SidebarProvider>
      <div className={styles.shell}>
        {toolbar}
        {workspaceToolbar}
        <div className={styles.body} aria-busy={busy || undefined}>
          <CollapsibleSidebar>{sidebar}</CollapsibleSidebar>
          <main className={styles.main}>{children}</main>
          <ToastRoot />
          {busy && (
            <div className={styles.busyOverlay} role="status" aria-live="polite" aria-label="更新中">
              <div className={styles.busyContent}>
                <span className={styles.spinner} aria-hidden="true" />
                <BusyProgressText message={busyMessage} appearance={busyMessageAppearance} />
              </div>
            </div>
          )}
        </div>
      </div>
    </SidebarProvider>
  )
}
