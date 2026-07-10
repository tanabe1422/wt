import type { PointerEvent as ReactPointerEvent } from 'react'

import type { SplitOrientation } from '../../hooks/useResizableSplit'
import { cx } from '../../utils/cx'
import styles from './ResizeHandle.module.css'

interface ResizeHandleProps {
  orientation: SplitOrientation
  onPointerDown: (event: ReactPointerEvent<HTMLDivElement>) => void
  ariaLabel: string
  active?: boolean
}

export function ResizeHandle({
  orientation,
  onPointerDown,
  ariaLabel,
  active = false,
}: ResizeHandleProps) {
  return (
    <div
      className={cx(
        styles.handle,
        orientation === 'horizontal' ? styles.horizontal : styles.vertical,
        active && styles.active,
      )}
      onPointerDown={onPointerDown}
      role="separator"
      aria-orientation={orientation === 'horizontal' ? 'vertical' : 'horizontal'}
      aria-label={ariaLabel}
    />
  )
}
