import type { ReactNode } from 'react'

import { ToastRoot } from '../../hooks/useToast'
import { BusyOverlay } from './BusyOverlay'
import type { BusyMessageAppearance } from './BusyProgressText'
import { CollapsibleSidebar, SidebarProvider } from './CollapsibleSidebar'
import styles from './MainLayout.module.css'

interface MainLayoutProps {
  sidebar: ReactNode
  children: ReactNode
  toolbar?: ReactNode
  workspaceToolbar?: ReactNode
  busy?: boolean
  /** Optional controlled message (Storybook). When omitted, BusyOverlay owns live progress. */
  busyMessage?: string
  busyMessageAppearance?: BusyMessageAppearance
}

export function MainLayout({
  sidebar,
  children,
  toolbar,
  workspaceToolbar,
  busy = false,
  busyMessage,
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
          <BusyOverlay busy={busy} message={busyMessage} appearance={busyMessageAppearance} />
        </div>
      </div>
    </SidebarProvider>
  )
}
