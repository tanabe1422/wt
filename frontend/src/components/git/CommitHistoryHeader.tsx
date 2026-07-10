import type { PointerEvent } from 'react'

import {
  COMMIT_HISTORY_COLUMN_IDS,
  COMMIT_HISTORY_COLUMN_LABELS,
  resizeModeForHandle,
  type CommitHistoryColumnId,
} from '../../hooks/useResizableColumns'
import { cx } from '../../utils/cx'
import styles from './CommitHistoryHeader.module.css'

interface CommitHistoryHeaderProps {
  gridTemplateColumns: string
  resizingColumn: CommitHistoryColumnId | null
  onResizeStart: (handleColumnId: CommitHistoryColumnId, clientX: number) => void
}

export function CommitHistoryHeader({
  gridTemplateColumns,
  resizingColumn,
  onResizeStart,
}: CommitHistoryHeaderProps) {
  const handleResizePointerDown =
    (columnId: CommitHistoryColumnId) => (event: PointerEvent<HTMLDivElement>) => {
      if (!resizeModeForHandle(columnId)) return
      event.preventDefault()
      event.stopPropagation()
      onResizeStart(columnId, event.clientX)
    }

  return (
    <div
      className={cx(styles.header, resizingColumn != null && styles.headerResizing)}
      style={{ gridTemplateColumns }}
      role="row"
    >
      {COMMIT_HISTORY_COLUMN_IDS.map((columnId) => (
        <div key={columnId} className={styles.cell} role="columnheader">
          <span className={styles.label}>{COMMIT_HISTORY_COLUMN_LABELS[columnId]}</span>
          {columnId !== 'sha' && (
            <div
              className={styles.resizeHandle}
              onPointerDown={handleResizePointerDown(columnId)}
              role="separator"
              aria-orientation="vertical"
              aria-label={`${COMMIT_HISTORY_COLUMN_LABELS[columnId]}列の幅を調整`}
            />
          )}
        </div>
      ))}
    </div>
  )
}
