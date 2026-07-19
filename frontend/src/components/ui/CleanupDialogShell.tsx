import type { ReactNode } from 'react'

import { cx } from '../../utils/cx'
import { IconButton } from '../ui/IconButton'
import styles from './CleanupDialogShell.module.css'

function CloseIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M18 6L6 18M6 6l12 12"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  )
}

export interface CleanupDialogShellProps {
  open: boolean
  title: string
  titleId: string
  onClose: () => void
  children: ReactNode
  footer: ReactNode
  /** Overrides default dialog width/height when needed (e.g. remote / stash). */
  dialogClassName?: string
  /** Overrides default body padding/gap when needed. */
  bodyClassName?: string
}

/** Shared chrome for cleanup dialogs (backdrop / header / footer). */
export function CleanupDialogShell({
  open,
  title,
  titleId,
  onClose,
  children,
  footer,
  dialogClassName,
  bodyClassName,
}: CleanupDialogShellProps) {
  if (!open) {
    return null
  }

  return (
    <div className={styles.backdrop} onClick={onClose}>
      <div
        className={cx(styles.dialog, dialogClassName)}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={(event) => event.stopPropagation()}
      >
        <div className={styles.header}>
          <h2 id={titleId}>{title}</h2>
          <IconButton type="button" aria-label="閉じる" onClick={onClose}>
            <CloseIcon />
          </IconButton>
        </div>
        <div className={cx(styles.body, bodyClassName)}>{children}</div>
        <div className={styles.footer}>{footer}</div>
      </div>
    </div>
  )
}

export { styles as cleanupDialogShellStyles }
