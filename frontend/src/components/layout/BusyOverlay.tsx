import { useEffect, useState } from 'react'

import { isWailsRuntime } from '../../lib/wails'
import { publishBusyMessage, registerBusyMessageListener } from '../../lib/busyMessageBus'
import { EventsOn } from '../../../wailsjs/runtime/runtime'
import { BusyProgressText, type BusyMessageAppearance } from './BusyProgressText'
import styles from './MainLayout.module.css'

const GIT_PROGRESS_EVENT = 'git:progress'

interface GitProgressPayload {
  message?: string
}

export interface BusyOverlayProps {
  busy: boolean
  /** When set, overrides live progress (Storybook / tests). */
  message?: string
  appearance?: BusyMessageAppearance
}

/**
 * Owns busy overlay copy and git:progress subscription so AppShell / sidebar
 * do not re-render on every progress line.
 */
export function BusyOverlay({
  busy,
  message: messageOverride,
  appearance = 'chip',
}: BusyOverlayProps) {
  const [liveMessage, setLiveMessage] = useState('')
  const controlled = messageOverride !== undefined

  useEffect(() => {
    if (controlled) {
      return
    }
    return registerBusyMessageListener(setLiveMessage)
  }, [controlled])

  useEffect(() => {
    if (controlled || !isWailsRuntime()) {
      return
    }
    return EventsOn(GIT_PROGRESS_EVENT, (payload: GitProgressPayload) => {
      const next = typeof payload?.message === 'string' ? payload.message.trim() : ''
      if (next) {
        setLiveMessage(next)
      }
    })
  }, [controlled])

  useEffect(() => {
    if (controlled) {
      return
    }
    if (busy) {
      setLiveMessage((current) => current || '処理中…')
      return
    }
    setLiveMessage('')
  }, [busy, controlled])

  if (!busy) {
    return null
  }

  const message = controlled ? messageOverride : liveMessage

  return (
    <div className={styles.busyOverlay} role="status" aria-live="polite" aria-label="更新中">
      <div className={styles.busyContent}>
        <span className={styles.spinner} aria-hidden="true" />
        <BusyProgressText message={message} appearance={appearance} />
      </div>
    </div>
  )
}

/** Call from busy handlers to seed the overlay without AppShell setState. */
export function seedBusyOverlayMessage(message: string): void {
  publishBusyMessage(message)
}
